# Setup Guide — Phase 1

## Prerequisites

Install these first if not already installed:
- [Node.js 22+](https://nodejs.org)
- [pnpm](https://pnpm.io/installation): `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for PostgreSQL + Redis)

---

## Step 1 — Clone & Install

```bash
cd social-platform
pnpm install
```

## Step 2 — Environment Variables

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in:
- `AUTH_SECRET` — generate with: `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from [Google Cloud Console](https://console.cloud.google.com)
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from [GitHub Developer Settings](https://github.com/settings/developers)
- `CLOUDINARY_*` — from [cloudinary.com](https://cloudinary.com) dashboard
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — same as `CLOUDINARY_CLOUD_NAME`

Leave `DATABASE_URL` and `REDIS_URL` as-is for local Docker setup.

## Step 3 — Start the Database

```bash
docker compose up -d
```

Wait ~10 seconds for PostgreSQL and Redis to be ready.

## Step 4 — Run Database Migration & Seed

```bash
pnpm db:migrate    # creates all tables
pnpm db:seed       # seeds demo users and posts
```

Demo accounts (password: `Password1`):
- alice@example.com
- bob@example.com
- carol@example.com

## Step 5 — Start the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Cloudinary Setup (for image uploads)

1. Go to [cloudinary.com](https://cloudinary.com), create a free account
2. In **Settings → Upload**, create an unsigned upload preset named `social_platform`
3. Set the folder to `posts`
4. Copy your Cloud Name to both `CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`

---

## OAuth Setup (optional for Phase 1)

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### GitHub
1. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Create new app
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `http://localhost:3000/api/auth/callback/github`

---

## Project Structure

```
social-platform/
├── apps/web/            ← Next.js 15 app (main codebase)
│   ├── app/             ← App Router pages
│   ├── components/      ← React components
│   ├── lib/             ← Utilities, validators, tRPC client
│   ├── server/trpc/     ← tRPC routers + context
│   └── prisma/          ← Schema + migrations + seed
├── packages/types/      ← Shared TypeScript types
└── docker-compose.yml   ← Local PostgreSQL + Redis
```

## Useful Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint
pnpm db:studio        # Open Prisma Studio (DB GUI)
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed demo data
```
