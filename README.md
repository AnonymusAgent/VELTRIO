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
npx drizzle-kit push      # create the tables
npm run dev
```

Open http://localhost:3000 and sign in at http://localhost:3000/admin/login.

The admin account is provisioned automatically on first login from `ADMIN_EMAIL` + `ADMIN_INITIAL_PASSWORD`. Change the password from **Admin → Settings** after signing in, and generate a recovery code there as well.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `ADMIN_EMAIL` | yes | The single admin login email. |
| `ADMIN_INITIAL_PASSWORD` | first run | Initial password (12+ characters) used to create the admin account. |
| `ADMIN_RECOVERY_CODE` | recommended | One-time recovery code for password reset. Cleared after use. |
| `UPLOAD_DIR` | production | Persistent directory for uploaded media (default `.data/uploads`). |
| `UPLOAD_STORAGE_GB` | no | Storage quota in GB (default `10`). |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical site URL, used for metadata and the sitemap. |
| `NEXT_PUBLIC_ADSENSE_*` | no | AdSense publisher ID and slot IDs. Leave blank to show labeled placeholders. |

See `.env.example` for the full list.

## Database

Schema lives in `src/db/schema.ts` (Drizzle, `pg-core`). Apply changes with:

```bash
npx drizzle-kit push
```

If a push prompts interactively in a non-TTY environment, run `npx drizzle-kit push --force`.

> Upgrading an existing database: tables from retired integrations (`telegram_posts`, `submissions`, `ad_settings`, `newsletter`) and the unused `embed_url`, `source_url`, `telegram_post_url`, `telegram_file_id`, `category_id` columns were removed from the schema. `drizzle-kit push` will drop them if they exist — back up first if you need that historical data.

> `drizzle.config.json` ships with the local development connection string. Update its `dbCredentials.url` to your production database before running migrations against a hosted database, or run `drizzle-kit` with your own config.

## Uploads and storage

Uploaded media is written to `UPLOAD_DIR` and served through `/api/media/[id]` with `206 Partial Content` range support. **Set `UPLOAD_DIR` to a persistent volume before deploying** — serverless filesystems are ephemeral and uploaded videos will be lost on redeploy.

The default quota is 10 GB (`UPLOAD_STORAGE_GB`). File signatures are validated, so a renamed file cannot masquerade as a valid video or image.

## Ads

Add your AdSense publisher ID and ad-unit IDs to the environment. Every placement is already wrapped with an "Advertisement" label and falls back to a clearly marked demo slot when unconfigured. `/ads.txt` is generated from your publisher ID, and `/adsense-setup` documents each placement.

## Deployment

1. Push this repository to GitHub.
2. Import it into your host (Vercel, Railway, Render, Fly.io, a VPS, etc.) and create a PostgreSQL database.
3. Set the environment variables above. Point `UPLOAD_DIR` at a persistent volume.
4. Run `npx drizzle-kit push` once against the production database.
5. Sign in at `/admin/login`, change the password, and generate a recovery code.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # production server
npm run lint       # ESLint
npm run typecheck  # TypeScript, no emit
```

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
