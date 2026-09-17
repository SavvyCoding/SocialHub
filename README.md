# SocialHub

[![CI](https://github.com/SavvyCoding/SocialHub/actions/workflows/ci.yml/badge.svg)](https://github.com/SavvyCoding/SocialHub/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-f69220)](https://pnpm.io)

A full-featured, self-hostable social platform where a profile is more than a feed. Alongside posts, comments, likes, stories and direct messages, every user gets a **showcase**: the books they read, the films and shows they watch, the places they have been, and the goals they are working towards.

Built with Next.js 15, tRPC, Prisma on PostgreSQL (with pgvector), Redis, Socket.IO and BullMQ, and shipped as a Docker Compose stack.

## Features

**Social**
- Feed with fan-out-on-write and a per-user algorithm preference (chronological, engagement, mixed)
- Posts with images, hashtags, @mentions, polls, drafts, scheduling, pinning, content warnings and link previews
- Comments with threads and emoji reactions; likes, shares, bookmarks and collections
- Stories that expire after 24 hours
- Follows, friend requests, close friends, blocks, mutes and muted keywords
- Real-time notifications and direct messaging over Socket.IO, with email digests via Resend
- Trending posts, hashtag pages, semantic search and recommendations backed by pgvector embeddings
- Badges, follower milestones, post impressions and an activity heatmap

**Showcase**
- 📚 Books: reading shelves with ratings and reviews, searched from Open Library
- 🎬 Movies & TV: watchlist with status, ratings and reviews, searched from TMDB
- 🗺️ Places: a travel log with an optional Mapbox map
- 🎯 Goals: a bucket list grouped by category with completion tracking
- Experience, education, skills and endorsements

**Platform**
- NextAuth 5 with Google, GitHub and email/password sign-in
- Redis sliding-window rate limiting on every write endpoint
- Domain events on an in-process bus feeding notifications, cache invalidation and background jobs
- BullMQ workers for emails, mentions, embeddings, scheduled posts, story cleanup and a weekly digest
- Read-replica support, PgBouncer, Sentry, and a Lighthouse-gated CI pipeline

## Quick start

Prerequisites: Node.js 22+, pnpm 9, Docker Desktop.

```bash
git clone https://github.com/SavvyCoding/SocialHub.git
cd SocialHub
pnpm install
cp .env.example apps/web/.env.local   # then set AUTH_SECRET at minimum
docker compose up -d                  # PostgreSQL (pgvector) + Redis
pnpm db:migrate
pnpm db:seed                          # demo users alice/bob/carol@example.com, password Password1
pnpm dev                              # web on :3000, socket server on :3001
```

Open http://localhost:3000 and sign in as one of the demo users. See [SETUP.md](SETUP.md) for OAuth, Cloudinary, TMDB and Mapbox configuration. External services are optional for starting the app. Image upload, movie search and the travel map need their service configured before they work; everything else runs without them.

## Running with Docker

The `deployment/` folder holds a production Compose stack (web, socket server, worker, PostgreSQL, PgBouncer, Redis) driven by a small helper script:

```bash
cp deployment/.env.example deployment/.env   # fill in secrets
./deployment/deploy.sh build
./deployment/deploy.sh up                    # runs migrations, then starts everything
./deployment/deploy.sh seed
./deployment/deploy.sh status
```

The web app listens on port 3080 and the socket server on 3001 by default.

## Project layout

```
apps/web/             Next.js 15 app (App Router, React 19) and the BullMQ worker
  app/                Routes
  components/         UI (shadcn/ui primitives in components/ui)
  lib/                Auth, db, redis, queue, rate limiting, validators
  server/trpc/        tRPC routers and context
  server/events/      Domain event bus and handlers
  server/jobs/        Background job processors
  server/services/    Notification, social graph, embedding, audit services
  prisma/             Schema, migrations, seed
  tests/              Vitest unit tests
apps/socket-server/   Express + Socket.IO real-time server
e2e/                  Playwright end-to-end tests
deployment/           Production Docker Compose stack
```

## Development

```bash
pnpm dev          # start all apps
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright (needs a server on :3000 or PLAYWRIGHT_BASE_URL)
pnpm db:studio    # Prisma Studio
pnpm --filter web worker   # run the BullMQ worker
```

Run a single unit test file:

```bash
pnpm --filter web vitest run tests/trpc/post.test.ts
```

CI runs type checking, lint and unit tests against real PostgreSQL and Redis services, then Playwright E2E on a production build, then Lighthouse with performance, accessibility, best-practice and SEO thresholds.

## Architecture in brief

- **API**: tRPC 11 routers in `apps/web/server/trpc/router/`, merged in `_app.ts`. Zod validates every input. `authedProcedure` enforces a session.
- **Data**: Prisma with about 47 models. Embeddings use a pgvector column and raw SQL.
- **Events**: routers emit typed events; handlers fan out to notifications, Redis caches, embedding jobs and activity feeds.
- **Real-time**: the socket server verifies the shared JWT secret and relays Redis pub/sub channels to clients.
- **Jobs**: BullMQ queues with retries, run by a single worker process.

[CLAUDE.md](CLAUDE.md) has a fuller architecture tour and the conventions the codebase follows.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations. Security issues should go through [SECURITY.md](SECURITY.md) rather than the public issue tracker.

## License

Copyright 2026 Digvijay Parmar. Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution details.
