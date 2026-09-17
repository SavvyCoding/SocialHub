## What

<!-- One or two sentences on what this PR changes. Link the issue it closes, e.g. "Closes #123". -->

## Why

<!-- The problem or motivation. Skip if the linked issue already explains it. -->

## How

<!-- Anything a reviewer needs to know about the approach: new events, migrations, env vars, trade-offs. -->

## Testing

<!-- How you verified it. Tick what applies. -->

- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally
- [ ] Unit tests added or updated for changed routers, validators or jobs
- [ ] E2E test added or updated for user-visible changes
- [ ] Manually tested in the browser (say what you tried)

## Checklist

- [ ] New tRPC inputs are validated with Zod and rate-limited where they write
- [ ] Side effects go through the event bus, not direct service calls from routers
- [ ] Schema changes come with a named Prisma migration
- [ ] New env vars are documented in `.env.example` and `deployment/.env.example`
- [ ] No secrets, personal data or generated media are included
