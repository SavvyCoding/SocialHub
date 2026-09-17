# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install               # Install all dependencies
pnpm dev                   # Start all apps (web + socket-server) via Turbo
pnpm build                 # Build all apps
pnpm lint                  # ESLint across all packages
pnpm typecheck             # TypeScript type checking across all packages
pnpm test                  # Run unit tests (Vitest) across all packages
pnpm db:migrate            # Run Prisma migrations (apps/web)
pnpm db:push               # Push schema without migrations
pnpm db:studio             # Open Prisma Studio GUI
pnpm db:seed               # Seed demo data (alice/bob/carol@example.com, password: Password1)
pnpm --filter web worker   # Start the BullMQ worker (tsx server/worker.ts)
pnpm test:e2e              # Run Playwright E2E tests (needs a server on :3000 or PLAYWRIGHT_BASE_URL)
pnpm test:e2e:ui           # Run Playwright with interactive UI
```

Run a single unit test file:
```bash
pnpm --filter web vitest run tests/trpc/post.test.ts
```

Run a single E2E test:
```bash
npx playwright test e2e/feed.spec.ts --project=chromium
```

Local dev prerequisites: `docker compose up -d` (Postgres + Redis) and `apps/web/.env.local` copied from `.env.example`. See `SETUP.md` for OAuth/Cloudinary setup.

### Dockerized deployment (the usual way this repo is run on this machine)

`deployment/deploy.sh {build|up|down|restart|logs [service]|migrate|seed|test|status}` drives `deployment/docker-compose.prod.yml` with `deployment/.env`. `docker-compose.deploy.yml` is the same stack attached to the external `openfang-1_default` network. Containers: `social_platform_web` (host port 3080), `social_platform_socket` (3001), `social_platform_worker`, `social_platform_pgbouncer`, `social_platform_db` (pgvector/pg16), `social_platform_redis`. A one-shot `migrate` container runs `prisma migrate deploy` before `web` starts.

Node is not on the host bash PATH, so when working against the running stack, run unit tests inside the worker container and copy changed files in first:

```bash
docker cp apps/web/server/trpc/router/post.ts social_platform_worker:/app/apps/web/server/trpc/router/post.ts
docker exec social_platform_worker sh -c "cd /app/apps/web && node_modules/.bin/vitest run tests/trpc/post.test.ts"
# After schema or dependency changes:
./deployment/deploy.sh migrate
docker compose -f deployment/docker-compose.deploy.yml up -d --build web worker
```

## Architecture

**Monorepo** using pnpm workspaces + Turborepo with two packages:

- **`apps/web`** — Next.js 15 (App Router, React 19) — the main application, plus the BullMQ worker entrypoint
- **`apps/socket-server`** — Express + Socket.IO server for real-time notifications/messaging

**Infrastructure** (via docker-compose): PostgreSQL 16 with pgvector + PGBouncer + Redis 7.

### API Layer — tRPC

Type-safe API using tRPC 11 with SuperJSON transformer. Routers live in `apps/web/server/trpc/router/` and are merged in `_app.ts`. Two procedure types:
- `publicProcedure` — no auth required
- `authedProcedure` — enforces session via middleware, throws `UNAUTHORIZED`

Context (`server/trpc/context.ts`) provides `{ session, db, redis }`.

Routers: `post`, `user`, `follow`, `profile`, `story`, `notification`, `message`, `book`, `movie`, `place`, `goal`, `hashtag`, `block`, `search`, `collection`, `report`, `closeFriend`. The `post` router is large (feed, comments, likes, polls, drafts, scheduling, pinning, tags, trending, impressions, content warnings, feed algorithm preference).

### Authentication

NextAuth 5 (beta) configured in `apps/web/lib/auth.ts`:
- Providers: Google OAuth, GitHub OAuth, Credentials (bcrypt)
- JWT session strategy
- Middleware (`apps/web/middleware.ts`) protects routes and redirects

### Database

Prisma ORM with schema at `apps/web/prisma/schema.prisma` (~47 models). `lib/db.ts` optionally wraps the client with `@prisma/extension-read-replicas` when `DATABASE_READ_URL` is set. Model groups:
- Auth (User, Account, Session, VerificationToken)
- Social graph (Follow, FriendRequest, Block, Mute, CloseFriend)
- Content (Post, Comment, Like, Share, Bookmark, Hashtag/PostHashtag, PostMention, PostTag, Poll/PollOption/PollVote, Story/StoryView, LinkPreview, PostImpression, PostReport)
- Organization (Collection/CollectionItem, SavedSearch, MutedKeyword, NotificationPreference)
- Messaging (Conversation, DirectMessage)
- Showcase (Experience, Education, Skill/UserSkill/Endorsement, BookEntry, MovieEntry, Place, Goal, UserBadge)
- System (Notification, AuditLog, FeedEntry, Embedding)

`Embedding.vector` is `Unsupported("vector(384)")`, so embedding reads/writes go through `$executeRawUnsafe`/`$queryRaw` in `server/services/embedding.service.ts`, not the Prisma query API. Migrations are hand-named by feature phase (e.g. `20260326_phase1_pronouns_post_tags_badges_impressions`).

### Domain events

Routers emit typed events on an in-process `eventBus` (`server/events/event-bus.ts`, event map in `server/events/types.ts`, e.g. `post.created`, `user.followed`, `message.sent`). Handlers in `server/events/handlers/` fan out to notifications, Redis cache invalidation, embedding jobs, and activity feeds. `initEventHandlers()` is called once from the tRPC route handler (`app/api/trpc/[trpc]/route.ts`). Prefer emitting an event over calling side-effect services directly from a router.

### Real-time

Socket.IO server authenticates via JWT (shared `AUTH_SECRET`, verified with `jose`). Redis pub/sub adapter enables horizontal scaling. `notification.service.ts` publishes to the `notifications:<userId>` Redis channel, which the socket server relays as `notification:new` (and `activity:new`); there is also an authenticated internal `POST /notify` endpoint. Client connects via providers in `apps/web/components/providers.tsx`.

### Background Jobs

BullMQ queues created via `lib/queue.ts` (dedicated ioredis connection, 3 attempts with exponential backoff). Job processors in `apps/web/server/jobs/`, all run by `server/worker.ts`:
- `email-notifications` — Sends emails via Resend (only for high-signal notification types, only when `RESEND_API_KEY` is set)
- `process-mentions` — Extracts @mentions and creates notifications
- `maintenance` — `cleanup-expired-stories` removes 24h-old stories
- `generate-embeddings` — Upserts pgvector embeddings for posts/users
- `publish-scheduled-posts` — Publishes posts at their `scheduledAt`
- `weekly-digest` — Repeatable cron job (Mondays 09:00 UTC) registered by the worker on startup

### Semantic search & recommendations

`lib/embedding.ts` calls an Ollama-style or OpenAI-compatible embedding endpoint (`EMBEDDING_API_URL`, `EMBEDDING_MODEL`, 384 dimensions). The `search` router exposes semantic post/user search and recommendations backed by pgvector similarity queries.

### Rate Limiting

Redis sliding window implementation in `apps/web/lib/rate-limit.ts`. `RATE_LIMITS` has named write limits (createPost 10/min, comment 30/min, like 60/min, follow 20/min, showcaseAdd, search, message 30/min) and read limits (readFeed, readProfile, readNotifications). Apply the matching one at the top of each procedure.

### Caching & Feed

Social graph service (`server/services/social-graph.service.ts`) caches following lists and excluded user IDs (blocked/muted) in Redis with 1-hour TTL, and exports shared `authorSelect`/`countSelect` and `batchGetInteractions` helpers used by every post-returning procedure. Feed uses fan-out-on-write via the `FeedEntry` table; the user's `feedAlgorithm` preference (CHRONOLOGICAL / ENGAGEMENT / MIXED) changes ordering.

### External Services

- **Cloudinary** — Image uploads (unsigned preset `social_platform`)
- **TMDB API** — Movie/show search for showcase
- **OpenLibrary API** — Book search for showcase
- **Mapbox GL** — Places/travel map
- **Resend** — Transactional emails
- **Sentry** — Error tracking
- **Embedding API** — Ollama or OpenAI-compatible, for semantic search

## Testing

Unit tests live in `apps/web/tests/` (`trpc/*.test.ts` per router, `validators/`, plus performance/scalability/security suites) and run with Vitest in a node environment. Router tests use `createCallerFactory(router)` with a mocked `db`/`redis` context and hoisted `vi.mock` calls for `@/lib/rate-limit`, `@/server/services/notification.service`, `@/server/events/event-bus`, `@/server/services/audit.service`, and `@/lib/queue`. Copy the mock block from an existing router test when adding a new one; new `RATE_LIMITS` entries must be added to that mock too.

E2E specs live in `e2e/` (Playwright, chromium + mobile-chrome projects) and expect the seeded demo users.

## CI Pipeline

Three-job GitHub Actions workflow (`.github/workflows/ci.yml`):
1. **Type check + Lint + Unit tests** — with Postgres + Redis services, runs `prisma migrate deploy` first
2. **E2E tests** — Playwright on Chromium against a production build, screenshots/video on failure
3. **Lighthouse CI** — Performance (>=0.75), Accessibility (>=0.90), Best Practices (>=0.85), SEO (>=0.80)

## Key Conventions

- Zod schemas for all tRPC input validation; shared validators in `lib/validators/`
- Path alias `@/*` maps to `apps/web/*`
- UI primitives from shadcn/ui in `components/ui/`
- Styling with TailwindCSS 3.4 + class-variance-authority
- State management with Zustand (client) + React Query (server state via tRPC)
- Logging via pino (`lib/logger.ts`), not `console.log`
- All env vars go in `apps/web/.env.local` (copy from `.env.example`); deployment env goes in `deployment/.env`
