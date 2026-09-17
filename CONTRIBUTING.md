# Contributing to SocialHub

Thanks for your interest in contributing. This document explains how to set up a development environment, the conventions the codebase follows, and how to get a change merged.

By contributing you agree that your contributions are licensed under the [Apache License 2.0](LICENSE), as described in section 5 of the license. No separate contributor agreement is required.

## Getting set up

1. Fork the repository and clone your fork.
2. Follow the [Quick start](README.md#quick-start) in the README. You need Node.js 22+, pnpm 9 and Docker.
3. Run `pnpm lint`, `pnpm typecheck` and `pnpm test` once before you change anything, so you know the baseline is green.

## Making a change

- **Open an issue first** for anything larger than a small fix, so the approach can be discussed before you spend time on it. Bug reports and feature requests have templates.
- **Branch from `main`.** Use a short descriptive name such as `fix/poll-vote-count` or `feat/collection-sharing`.
- **Keep pull requests focused.** One logical change per PR is much easier to review than a bundle.

## Conventions

The codebase follows a few rules consistently; please match them.

- **API**: every tRPC procedure validates its input with a Zod schema. Shared validators live in `apps/web/lib/validators/`. Use `authedProcedure` for anything that needs a session and apply the matching `RATE_LIMITS` entry at the top of each write procedure.
- **Side effects**: emit a domain event on the event bus rather than calling notification, cache or job services directly from a router. Handlers live in `apps/web/server/events/handlers/`.
- **Database**: schema changes go through a Prisma migration named by feature, for example `20260326_phase1_pronouns_post_tags_badges_impressions`. Never edit an existing migration.
- **Logging**: use the pino logger from `apps/web/lib/logger.ts`, not `console.log`.
- **UI**: shadcn/ui primitives in `components/ui/`, Tailwind for styling, Zustand for client state and React Query (via tRPC) for server state.
- **Environment**: new variables go in `.env.example` and `deployment/.env.example` with a comment, never hard-coded.

## Tests

- Unit tests use Vitest and live in `apps/web/tests/`. Router tests build a caller with mocked `db` and `redis`; copy the mock block from an existing router test when adding a new one, and add any new `RATE_LIMITS` entries to that mock.
- End-to-end tests use Playwright in `e2e/` and expect the seeded demo users.
- A change to a router, validator or job should come with a unit test. A user-visible feature should come with an E2E test.

Run everything locally before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e        # with a dev server running on :3000
```

## Commit messages

Use the conventional prefixes already in the history: `feat:`, `fix:`, `chore:`, `test:`, `ci:`, `docs:`, `refactor:`. Keep the subject under about 72 characters and explain the *why* in the body when it is not obvious.

## Pull requests

- Fill in the PR template. Say what changed, why, and how you tested it.
- Make sure CI is green. It runs type checking, lint, unit tests, Playwright and Lighthouse.
- Expect review comments; they are about the code, not about you. Push follow-up commits rather than force-pushing while a review is in progress.
- A maintainer will squash-merge once approved.

## Reporting security issues

Please do not open public issues for security problems. See [SECURITY.md](SECURITY.md).

## Questions

Open a discussion or an issue. There are no silly questions about a codebase this size.
