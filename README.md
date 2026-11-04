# Video Hub

A cinematic, Netflix-inspired video platform with a private admin studio for uploading and publishing original videos. Built with Next.js (App Router), PostgreSQL, and Drizzle ORM.

## Features

- **Public site** — homepage hero, trending, categories, search, video watch page, comments, likes, save-to-list, branded loading screen.
- **Private admin studio** at `/admin` — dashboard, direct uploads with progress, thumbnail handling, library management, publishing controls, and account settings.
- **Direct uploads** — videos stream to server-side storage and play back with HTTP range requests (seeking works). No Telegram, TeraBox, or third-party imports.
- **Email + password authentication** — scrypt password hashing, database-backed sessions, HTTP-only cookies, login throttling, and a recovery-code password reset. No social/OAuth providers.
- **Monetization ready** — Google AdSense slots (header, sidebar, in-feed, video, footer) with a setup guide at `/adsense-setup` and an auto-generated `/ads.txt`.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Local setup

```bash
npm install
cp .env.example .env      # then edit the values
npm run db:migrate        # create the tables
npm run dev
```

Open http://localhost:3000 and sign in at http://localhost:3000/admin/login.

There is one fixed admin account, `alomukhtar@playhub.vom` (hardcoded in `src/lib/admin-shared.ts`). It is provisioned automatically on first login using `ADMIN_INITIAL_PASSWORD`. Change the password from **Admin → Settings** after signing in, and generate a recovery code there as well.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Direct PostgreSQL connection string. Used by Drizzle schema commands. |
| `DATABASE_URL_POOLED` | recommended | Pooled runtime connection string. Used by the app when present; recommended for Neon on Vercel. |
| `NEON_AUTH_BASE_URL` | no | Neon Auth base URL. Stored for configuration; the current admin studio still uses its built-in email/password login. |
| `ADMIN_INITIAL_PASSWORD` | first run | Initial password (12+ characters) used to create the fixed admin account (`alomukhtar@playhub.vom`). |
| `ADMIN_RECOVERY_CODE` | recommended | One-time recovery code for password reset. Cleared after use. |
| `UPLOAD_DIR` | production | Persistent directory for uploaded media (default `.data/uploads`). |
| `UPLOAD_STORAGE_GB` | no | Storage quota in GB (default `10`). |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical site URL, used for metadata and the sitemap. |
| `NEXT_PUBLIC_ADSENSE_*` | no | AdSense publisher ID and slot IDs. Leave blank to show labeled placeholders. |

See `.env.example` for the full list.

## Database

Schema lives in `src/db/schema.ts` (Drizzle, `pg-core`). Changes are shipped as versioned SQL migrations in `drizzle/`, generated from the schema and applied with a migration runner.

```bash
# after editing src/db/schema.ts
npm run db:generate       # write a new drizzle/NNNN_*.sql migration
npm run db:migrate        # apply pending migrations (safe to re-run)
```

`npm run db:migrate` runs `scripts/db-migrate.ts`, which applies only the migrations that have not been recorded yet (tracked in `drizzle.__drizzle_migrations`). It is idempotent, so it is safe to run on every deploy. If the tables already exist but no migrations are recorded (e.g. they were created earlier with `drizzle-kit push`), it baselines the initial migration instead of re-running it.

For quick local iteration you can still use `npm run db:push` (`drizzle-kit push`), which diffs the schema against the database directly. If a push prompts interactively in a non-TTY environment, run `npx drizzle-kit push --force`. Prefer migrations for anything shared or production.

> `drizzle.config.ts` and the migration runner read `DATABASE_URL` from `.env`. For Neon, keep `DATABASE_URL` as the direct (non-pooled) endpoint and set `DATABASE_URL_POOLED` for the running app. Run migrations and schema pushes through the direct endpoint, not the pooler.

## Uploads and storage

Uploaded media is written to `UPLOAD_DIR` and served through `/api/media/[id]` with `206 Partial Content` range support. **Set `UPLOAD_DIR` to a persistent volume before deploying** — serverless filesystems are ephemeral and uploaded videos will be lost on redeploy. Neon persists the database, not uploaded video files; Vercel deployments need separate durable object/blob storage for media.

The default quota is 10 GB (`UPLOAD_STORAGE_GB`). File signatures are validated, so a renamed file cannot masquerade as a valid video or image.

## Ads

Add your AdSense publisher ID and ad-unit IDs to the environment. Every placement is already wrapped with an "Advertisement" label and falls back to a clearly marked demo slot when unconfigured. `/ads.txt` is generated from your publisher ID, and `/adsense-setup` documents each placement.

## Deployment

1. Push this repository to GitHub.
2. Import it into your host (Vercel, Railway, Render, Fly.io, a VPS, etc.) and create a PostgreSQL database.
3. Set the environment variables above. Point `UPLOAD_DIR` at a persistent volume.
4. Apply the schema. On Vercel the build command runs `npm run db:migrate` before `next build`, so the database is migrated automatically on each deploy. On other hosts, run `npm run db:migrate` once against the production database (or wire it into your build/release step).
5. Sign in at `/admin/login`, change the password, and generate a recovery code.

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # production server
npm run lint        # ESLint
npm run typecheck   # TypeScript, no emit
npm run db:generate # generate a SQL migration from schema changes
npm run db:migrate  # apply pending migrations (idempotent)
npm run db:push     # diff schema straight into the database (local iteration)
npm run db:seed     # insert the default categories
```

On Vercel, set the **Build Command** to `npm run db:migrate && npm run build` so the production database schema is applied automatically on every deploy.

## Project layout

```
src/app/                  routes (public site, /admin studio, /api handlers)
src/components/           shared UI (player, cards, header/footer, brand, ads)
src/db/                   Drizzle client and schema
src/lib/                  auth, storage, video queries, shared helpers
public/                   logo, favicon, poster artwork
```

## Content policy

Only upload content you own or are licensed to publish. Adult, leaked, and non-consensual material is prohibited. See `/terms` and `/dmca`.
