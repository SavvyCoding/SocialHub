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
pnpm test:e2e              # Run Playwright E2E tests
pnpm test:e2e:ui           # Run Playwright with interactive UI
```

Run a single unit test file:
```bash
pnpm --filter web vitest run path/to/file.test.ts
```

Run a single E2E test:
```bash
npx playwright test e2e/specific-test.spec.ts
```

## Architecture

**Monorepo** using pnpm workspaces + Turborepo with three packages:

- **`apps/web`** — Next.js 15 (App Router, React 19) — the main application
- **`apps/socket-server`** — Express + Socket.IO server for real-time notifications/messaging
- **`packages/types`** — Shared TypeScript types

**Infrastructure** (via docker-compose): PostgreSQL 16 + PGBouncer + Redis 7.

### API Layer — tRPC

Type-safe API using tRPC 11 with SuperJSON transformer. Routers live in `apps/web/server/trpc/router/` and are merged in `_app.ts`. Two procedure types:
- `publicProcedure` — no auth required
- `authedProcedure` — enforces session via middleware, throws `UNAUTHORIZED`

Context (`server/trpc/context.ts`) provides `{ session, db, redis }`.

Routers: `post`, `user`, `follow`, `profile`, `story`, `notification`, `message`, `book`, `movie`, `place`, `goal`, `hashtag`, `block`.

### Authentication

NextAuth 5 (beta) configured in `apps/web/lib/auth.ts`:
- Providers: Google OAuth, GitHub OAuth, Credentials (bcrypt)
- JWT session strategy
- Middleware (`apps/web/middleware.ts`) protects routes and redirects

### Database

Prisma ORM with schema at `apps/web/prisma/schema.prisma`. ~25 models covering:
- Auth tables (User, Account, Session, VerificationToken)
- Social graph (Follow, FriendRequest, Block, Mute)
- Content (Post, Comment, Like, Share, Bookmark, Hashtag, Story)
- Messaging (Conversation, DirectMessage)
- Showcase (Experience, Education, UserSkill, BookEntry, MovieEntry, Place, Goal)
- System (Notification, AuditLog, FeedEntry)

### Real-time

Socket.IO server authenticates via JWT (shared `AUTH_SECRET`). Redis pub/sub adapter enables horizontal scaling. Next.js pushes notifications to the socket server's internal `/notify` endpoint. Client connects via providers in `apps/web/components/providers.tsx`.

### Background Jobs

BullMQ queues in `apps/web/server/jobs/`:
- `email-notifications` — Sends emails via Resend
- `process-mentions` — Extracts @mentions and creates notifications
- `cleanup-expired-stories` — Removes 24h-old stories

Worker started in `apps/web/server/worker.ts`.

### Rate Limiting

Redis sliding window implementation in `apps/web/lib/rate-limit.ts`. Applied per-procedure in tRPC routers (e.g., post creation: 10/min, likes: 60/min).

### Caching

Social graph service (`server/services/social-graph.service.ts`) caches following lists and excluded user IDs in Redis with 1-hour TTL. Feed uses fan-out-on-write pattern with `FeedEntry` table.

### External Services

- **Cloudinary** — Image uploads (unsigned preset `social_platform`)
- **TMDB API** — Movie/show search for showcase
- **OpenLibrary API** — Book search for showcase
- **Mapbox GL** — Places/travel map
- **Resend** — Transactional emails
- **Sentry** — Error tracking

## CI Pipeline

Three-job GitHub Actions workflow (`.github/workflows/ci.yml`):
1. **Type check + Lint + Unit tests** — with Postgres + Redis services
2. **E2E tests** — Playwright on Chromium, screenshots/video on failure
3. **Lighthouse CI** — Performance (>=0.75), Accessibility (>=0.90), Best Practices (>=0.85), SEO (>=0.80)

## Key Conventions

- Zod schemas for all tRPC input validation
- Path alias `@/*` maps to `apps/web/*`
- UI primitives from shadcn/ui in `components/ui/`
- Styling with TailwindCSS 3.4 + class-variance-authority
- State management with Zustand (client) + React Query (server state via tRPC)
- All env vars go in `apps/web/.env.local` (copy from `.env.example`)
