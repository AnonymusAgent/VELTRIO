# VELTRIO

A cinematic, Netflix-inspired video platform with a private admin studio for uploading and publishing original videos. Built with Next.js (App Router), PostgreSQL, and Drizzle ORM.

## Features

- **Public site** — homepage hero, trending, categories, search, video watch page, comments, likes, save-to-list, branded loading screen.
- **Private admin studio** at `/admin` — dashboard, direct uploads with progress, thumbnail handling, library management, publishing controls, and account settings.
- **Direct uploads** — videos use the configured local-volume or Vercel Blob provider and play back through the authenticated media proxy with HTTP range requests (seeking works). No Telegram, TeraBox, or third-party imports.
- **User accounts** — Neon Auth / Better Auth email sign-up and sign-in at `/account`, profile menu and account settings at `/settings/account`. The admin login remains separate. Viewing and privacy preferences are available to everyone at `/settings` and are stored in the browser.
- **Creator studio** — `/studio` lists each signed-in creator’s own videos and views, with local filesystem uploads, thumbnails, metadata editing, publishing and deletion. Earnings are marked unavailable until a real monetization and payout system is implemented.
- **First-party analytics** — opt-in public page views and playback events in the admin overview. The last 30 days of page views exclude query strings and IP addresses; counts are estimates and exclude people who decline analytics. Playback totals are all-time and may include events recorded by older versions before consent was introduced; older watch-time measurements are not directly comparable to the new incremental measurements.
- **Admin authentication** — scrypt password hashing, database-backed sessions, HTTP-only cookies, login throttling, and a recovery-code password reset.
- **Optional first-party pre-roll** — a configured sponsor video can play before a video, with a skip control and a fallback if the clip fails. No display ad slots or ad-network SDK are loaded.

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

There is one fixed admin account, `alimukhtar@veltrio.com` (hardcoded in `src/lib/admin-shared.ts`). It is provisioned automatically on first login using `ADMIN_INITIAL_PASSWORD`. Change the password from **Admin → Settings** after signing in, and generate a recovery code there as well. Existing accounts from the former brand email are migrated automatically.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Direct PostgreSQL connection string. Used by Drizzle schema commands. |
| `DATABASE_URL_POOLED` | recommended | Pooled runtime connection string. Used by the app when present; recommended for Neon on Vercel. |
| `ALLOW_PREVIEW_DB_MIGRATIONS` | no | Set to `true` for Vercel **preview only** after assigning a separate preview database; otherwise preview builds skip automatic migrations. This does not isolate runtime database access. |
| `NEON_AUTH_BASE_URL` | for accounts | Neon Auth base URL from the Neon console. Enable email/password sign-in and configure verification and trusted origins there. |
| `NEON_AUTH_COOKIE_SECRET` | for accounts | Random secret of at least 32 characters used to sign Neon Auth cookies. Keep it private and stable across deployments. |
| `ADMIN_INITIAL_PASSWORD` | first run | Initial password (12+ characters) used to create the fixed admin account (`alimukhtar@veltrio.com`). |
| `ADMIN_RECOVERY_CODE` | recommended | One-time recovery code for password reset. Cleared after use. |
| `STORAGE_PROVIDER` | no | `local` (default) or `vercel_blob`. Blob mode requires `BLOB_READ_WRITE_TOKEN`. |
| `UPLOAD_DIR` | local mode | Persistent directory for uploaded media (default `.data/uploads`). |
| `UPLOAD_STORAGE_GB` | no | Storage quota in GB (default `10`). Applies to both providers. |
| `BLOB_READ_WRITE_TOKEN` | Blob mode | Vercel Blob read-write token. Keep it server-side; never expose it as a public variable. |
| `UPLOAD_CLEANUP_AGE_HOURS` | no | Age for abandoned local chunk cleanup (default `24`). |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical site URL, used for metadata and the sitemap. |
| `VIDEO_PREROLL_PATH` | no | Root-relative path to a licensed MP4/WebM deployed under `public/` (for example `/sponsors/promo.mp4`). Blank disables pre-roll. |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | no | Legacy publisher ID used only to generate `/ads.txt`; it does not enable ads. |

See `.env.example` for the full list. Apply migrations before enabling creator uploads or analytics. Creator uploads currently support only `STORAGE_PROVIDER=local` and require persistent storage; Vercel Blob creator uploads are not yet supported. User signup, upload, and playback must be tested against your configured Neon Auth instance and PostgreSQL database before deployment. The creator studio does not yet provide payouts, account-synced lists/subscriptions, or the full feature set of YouTube. Creator uploads are blocked on Vercel until a suitable durable upload backend is implemented. Before opening uploads to the public, add per-user quotas, abuse controls, content moderation, operational monitoring, and cleanup for unattached finalized creator assets.

## Database

Schema lives in `src/db/schema.ts` (Drizzle, `pg-core`). Changes are shipped as versioned SQL migrations in `drizzle/`, generated from the schema and applied with a migration runner.

```bash
# after editing src/db/schema.ts
npm run db:generate       # write a new drizzle/NNNN_*.sql migration
npm run db:migrate        # apply pending migrations (safe to re-run)
```

`npm run db:migrate` runs `scripts/db-migrate.ts`, which applies migrations not yet recorded in `drizzle.__drizzle_migrations`, using a database advisory lock and schema audit. If tables exist without migration records, the runner checks the complete initial schema before baselining; incomplete schemas are refused.

On Vercel, preview builds skip migrations by default. To test schema changes, first configure separate preview `DATABASE_URL` and `DATABASE_URL_POOLED` values pointing to an isolated database, then set `ALLOW_PREVIEW_DB_MIGRATIONS=true` **only for preview**. This guard prevents preview DDL by default; it does **not** prevent a running preview from reading or changing whichever database its runtime credentials reference. Preview and development credentials must never point at production data. A preview without the required migration may not work until its isolated database is prepared. Production deployments and local manual migrations continue to run normally.

For quick local iteration you can still use `npm run db:push` (`drizzle-kit push`), which diffs the schema against the database directly. If a push prompts interactively in a non-TTY environment, run `npx drizzle-kit push --force`. Prefer migrations for anything shared or production.

> `drizzle.config.ts` and the migration runner read `DATABASE_URL` from `.env`. For Neon, keep `DATABASE_URL` as the direct (non-pooled) endpoint and set `DATABASE_URL_POOLED` for the running app. Run migrations and schema pushes through the direct endpoint, not the pooler.

## Uploads and storage

The upload UI selects the configured provider. In the default `local` mode, media is written to `UPLOAD_DIR` and served through `/api/media/[id]` with `206 Partial Content` range support. **Set `UPLOAD_DIR` to a persistent volume before deploying local mode** — serverless filesystems are ephemeral and uploaded videos will be lost on redeploy. The `storage:cleanup` job removes abandoned local upload chunks.

For Vercel or other ephemeral deployments, configure durable object storage instead:

```dotenv
STORAGE_PROVIDER=vercel_blob
BLOB_READ_WRITE_TOKEN=your-server-only-vercel-blob-token
```

Admin Blob uploads use Vercel Blob client uploads, server-issued constrained tokens, server-side file-signature validation, database metadata, quota reservations, and the same `/api/media/[id]` proxy. Published media is cached. Blob uploads currently use public Blob URLs; the media proxy protects drafts but public Blob URLs must not be treated as private if discovered. Use a private storage adapter before relying on draft confidentiality. Apply the `0003` migration before using Blob-backed rows; it adds the provider discriminator and expands the storage-key column for object URLs.

The default quota is 10 GB (`UPLOAD_STORAGE_GB`) and counts both providers. File signatures are validated, so a renamed file cannot masquerade as a valid video or image. If a Blob upload completes but database finalization fails, the endpoint leaves the object intact to avoid deleting an already-referenced upload; the cleanup command removes unclaimed Blob objects older than the configured cleanup age. Schedule `npm run storage:cleanup` from your deployment host.

## Ads

Display placements and the AdSense script are disabled. To show a directly sold sponsor clip, place an MP4 or WebM you have the rights to use under `public/`, set `VIDEO_PREROLL_PATH` to its root-relative path (for example `/sponsors/promo.mp4`), and redeploy. The player labels it as an advertisement, offers a skip button after five seconds, and falls back to the requested video if the clip fails or stalls. The clip is not an ad-network integration: there is no targeting, campaign management, click-through, impression measurement, or automated revenue. Google AdSense display slots cannot simply be turned into video ads; a compliant video-ad provider (e.g. VAST/IMA), appropriate consent, or server-side ad insertion would require separate integration. No client-side or server-side approach can guarantee immunity from all ad blockers. `/ads.txt` remains for legacy publisher verification and does not enable ads.

## Deployment

1. Push this repository to GitHub.
2. Import it into your host (Vercel, Railway, Render, Fly.io, a VPS, etc.) and create a PostgreSQL database.
3. Set the environment variables above. For local mode, point `UPLOAD_DIR` at a persistent volume; for Vercel, set `STORAGE_PROVIDER=vercel_blob` and add the server-only `BLOB_READ_WRITE_TOKEN`.
4. Apply the schema. On Vercel the build command runs `npm run db:migrate` before `next build`, so the database is migrated automatically on each deploy. On other hosts, run `npm run db:migrate` once against the production database (or wire it into your build/release step).
5. Sign in at `/admin/login`, change the password, and generate a recovery code.
6. Use separate preview and development databases and authentication settings before running previews. Provision encrypted database and media backups, practice restoring them into an isolated environment, and test rollback procedures before production releases.

The [platform audit and roadmap](docs/PLATFORM_AUDIT_AND_ROADMAP.md) records verified functionality, launch blockers and remaining work. The [Mux 4K implementation plan](docs/MUX_4K_IMPLEMENTATION_PLAN.md) describes the streaming pipeline, credentials, costs and rollout gates.

### Streaming uploads (Mux)

Creator uploads stream through Mux, so the app needs no writable disk in production. Set `MUX_ENABLED=true` with `MUX_TOKEN_ID` + `MUX_TOKEN_SECRET` from a Mux environment; browsers then upload straight to Mux over a resumable connection, and portrait, thumbnail and playback URLs are served from Veltrio routes.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | yes | Mux API access token. |
| `MUX_ENABLED` | yes | Must be `true`; `false` hides streaming and falls back to the legacy local uploader. |
| `MUX_CORS_ORIGIN` | yes in production | Exact public origin allowed to create uploads. |
| `MUX_MAX_RESOLUTION` | no | Rendition cap, default `1080p` (`2160p` permits 4K). |
| `MUX_WEBHOOK_SECRET` | no | Verifies `/api/mux/webhook` for instant asset-state updates; polling covers it otherwise. |
| `MUX_PLAYBACK_SIGNING_KEY_ID`, `MUX_PLAYBACK_PRIVATE_KEY` | no | Enables signed, expiring playback tokens instead of public playback IDs. |

`/api/stream/status` reports whether a deployment is streaming-enabled without exposing credentials. `npm run storage:cleanup` also cancels abandoned streaming sessions so stale uploads never become billable assets. A [GitHub Actions workflow template](docs/github-actions-checks.yml) is provided for static checks, unit tests, a dependency audit and a build against dummy configuration. It is not active until installed in `.github/workflows/` by an account with workflow permission, and it would not verify live auth, media uploads, playback or deployed services.

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # production server
npm run lint        # ESLint
npm run typecheck   # TypeScript, no emit
npm run test:unit   # run the repository's unit tests
npm run db:generate # generate a SQL migration from schema changes
npm run db:migrate  # apply pending migrations (idempotent)
npm run db:push     # diff schema straight into the database (local iteration)
npm run db:seed     # insert the default categories
npm run storage:cleanup # remove abandoned local upload chunks
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
