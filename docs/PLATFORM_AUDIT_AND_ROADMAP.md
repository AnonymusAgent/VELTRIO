# VELTRIO platform audit and implementation roadmap

Audit baseline: 2026-11-05, commit `d3245ae35d27b33c39b51b4868f107e1a32b7b66`. This is a source/configuration review and targeted test run, not a penetration test or proof that every production integration works. The platform is **not ready for the requested public video-sharing launch**.

## Existing architecture

- **Web/API:** Next.js 16 App Router, React 19, TypeScript, server-rendered pages and route handlers. Dark/light/system themes and mobile layouts are already present.
- **Data:** Neon-compatible PostgreSQL with Drizzle ORM and migrations `0000`–`0005`. Runtime prefers a pooled connection; migrations use a direct connection. Schema includes videos, media, fixed admin and sessions, moderation inbox, first-party events and page views. Neon Auth owns regular-user identities separately; there is no account-linked creator-profile relation.
- **Accounts:** Neon Auth / Better Auth for users, separate fixed administrator with scrypt passwords, hashed session tokens, HTTP-only cookies, recovery code and database-backed throttling. Live signup, verification, password reset and persistence were not exercised in this audit.
- **Media:** Admin supports persistent local chunks or direct Vercel Blob client uploads. Creator uploads support persistent local storage only and are intentionally blocked on Vercel. Blob uses publicly discoverable object URLs; the media proxy cannot make them private. There is no transcoding worker, rendition manifest, adaptive streaming or processing queue.
- **Playback:** Native HTML video and range-based `/api/media/[id]`. Native controls, playback-speed selection, picture-in-picture, keyboard shortcuts, local resume/history and optional first-party pre-roll exist. Actual browser/codec support determines playback. No 4K, HLS/DASH or quality-selection guarantee.
- **Deployment:** Vercel project `video-hub` builds `main` using `npm run db:migrate && npm run build`. The most recent production deployment was READY and promoted to `https://veltrio-new.vercel.app`. Build configuration advertises database variables for production, preview and development together. Values were not decrypted or compared; the shared variable entries mean environment isolation is not established. Preview builds can execute migrations with those variables. The repository contains no CI workflow.

## Prioritized findings

Severity denotes launch impact, not a claim that every risk was exploited.

### Critical

1. **Public creator upload and adaptive video pipeline missing.** Creator storage deliberately refuses Vercel; files cannot reliably pass through its ephemeral filesystem. No asynchronous processing, authenticated provider webhook, HLS/DASH, rendition records or recovery. 4K and large-file acceptance are unverified. `src/lib/creator-storage.ts`, `src/app/api/creator/uploads`, `src/components/VideoPlayer.tsx`.
2. **Preview/development database isolation is unproven.** Vercel targets the same database-variable entries at all three environments and runs migrations in every build. Development or PR code can alter an existing live schema or data. Use separate Neon branches/projects and separate credentials for preview and development before testing or enabling preview migrations. Never infer isolation from a successful build. `scripts/db-migrate.ts`, Vercel build command.

### High

3. **Pre-publication moderation and abuse protection are insufficient for open creator signup.** Creator endpoints can set `published` immediately with a rights checkbox; there is no processing/moderation approval gate, per-user quota, suspension/appeal or audit trail. Keep public creator uploads closed until a real workflow exists. `src/app/api/creator/videos`.
4. **Object privacy is not guaranteed.** Admin Blob uploads explicitly use public URLs. Drafts can be accessed by anyone possessing the object URL even if the media proxy checks authorization. Use private object storage or a provider with signed playback; do not claim draft secrecy for public Blob. `src/lib/upload-client.ts`, `src/app/api/media/[id]/route.ts`.
5. **Authorization model is incomplete.** Admin is a single separate account, not the requested super-admin/admin/moderator RBAC. No user-management, account suspension, creator verification, or admin action audit logs. Preserve the fixed admin model until a careful additive migration and authorization rollout is designed. `src/lib/admin-auth.ts`.
6. **Engagement and traffic metrics are vulnerable to manipulation.** Views/likes rely on browser cookies; clients can delete cookies, views are not throttled, and playback/page events are client-submitted. They are estimates, not bot-resistant or authoritative. Likes cannot be unliked. `src/lib/video-counters.ts`, `src/app/api/analytics`, `src/app/api/videos/[slug]/event`.
7. **Missing operational controls.** No repository CI, verified backup/restore procedure, configured error-monitoring integration, processing-cost/bandwidth telemetry, or spending alerts were found. Actual provider settings, backups and alarms require owner verification.
8. **Production identity/credential exposure risk.** A database credential was previously shared in conversation; rotate it at Neon and update Vercel's direct and pooled secrets if this has not already been done. Do not paste secrets into issues or chat. Secret values were not read during this audit.

### Medium

9. **Personalization is browser-local.** My List, history, progress, follows and preferences are not account-synced; creator follow is not a subscription. No playlists, notifications, comment replies, block lists or account deletion. `src/lib/browser-storage.ts`, `src/components/CreatorFollowButton.tsx`.
10. **Creator identity is incomplete.** Existing creator profiles are tied to admin IDs; ordinary account-owned videos do not get independent creator profile pages or profile analytics. The studio shows only owned-video count/views; no watch time, subscribers or audience data. `src/db/schema.ts`, `src/lib/creator-store.ts`, `src/app/studio/page.tsx`.
11. **Discovery is partial.** Text search, categories, basic sort and paginated catalog exist; genre, date and duration filters, real personalized recommendations and search history do not. Homepage category shelves derive from the latest 48 videos, and related videos from the latest 48, so older matching videos can be omitted. Trending is a manually marked flag rather than computed behavior. `src/app/page.tsx`, `src/app/video/[slug]/page.tsx`.
12. **Scalability gaps.** Admin and creator libraries and the sitemap can load complete datasets; analytics aggregates can grow costly; PostgreSQL `ILIKE` search across title/description/JSON lacks a search index. Views and bot controls need bounded, indexed queries and operational testing at scale. `src/lib/video-store.ts`, `src/app/sitemap.ts`.
13. **SEO incomplete.** Titles, video Open Graph, category descriptions, robots and sitemap exist; creator/category sitemap coverage, video structured data, canonical configuration and generated image coverage are incomplete. `NEXT_PUBLIC_SITE_URL` is documented but not listed in the inspected Vercel project's custom environment entries.
14. **Resilience and race conditions.** Local asset deletion and video creation are separate operations; concurrent finalization/deletion needs transaction/ownership tests. Playback has an error message but no recovery or quality fallback. Public forms use origin checks and throttling, but lack comprehensive abuse testing and automated integration coverage.
15. **Provider configuration needs review.** Neon Auth beta dependency has peer warnings; update-user/change-password compatibility and production email verification/reset were not verified. Default deployment region is US East; actual CDN/video-provider regional delivery and Pakistan network conditions were not measured.

### Low

16. Three existing Next lint warnings for admin `<img>` elements. npm audit reports 0 critical, 0 high, 13 moderate and 7 low findings; review transitive upgrades without breaking Neon Auth.
17. Legal/support and legacy redirect routes exist, but accessibility, screen-reader coverage, translations and a complete design-token/component inventory need a dedicated review. Analytics consent and light/system theme must be preserved.

## Feature evidence and test coverage

| Area | Source evidence | Audit result |
| --- | --- | --- |
| Public discovery | Published uploads only; real-data empty/unavailable states; category/search catalog pagination | Source reviewed; no real populated catalog exercised |
| Auth and settings | Neon route proxy, separate admin session and forms | Browser tests mock Neon; live registration/login/reset not verified |
| Upload | Admin local and Blob paths; creator local-only | Source reviewed; real storage/large-file/4K not exercised |
| Playback | Native video, range proxy, local progress, speed, PiP and shortcuts | No real media, codecs, slow network or adaptive streaming verified |
| Social/moderation | Browser-local saves/follows, one-way cookie likes, guest comments/reports, admin inbox | Source reviewed; no real account-based engagement/permissions E2E |
| Schema | Six migration files and strict snapshot audit; production deployment previously logged schema up to date | No production data read or modified in this audit; schema correctness does not establish backup or data integrity |
| Responsive | Existing browser checks run mobile, tablet and desktop sizes | Auth uses mocked Neon and a local server with unavailable test DB; not a complete device/accessibility audit |
| Build/tests | Clean install, typecheck, production build with dummy configuration, lint and five unit scripts pass | Three existing lint warnings; 20 lower-severity dependency audit findings |

The previous deployment's successful database migration/audit is evidence for that deployment, not permission to use production data for new development. No production mutations were made in this audit.

## Roadmap and acceptance gates

1. **Safety and reproducibility (first):** document isolation, prevent preview builds from automatically migrating a shared database, establish isolated preview/development Neon resources, automated checks, test fixtures and verified backups. Review previously exposed credentials. Gate: CI, safe preview builds, restore drill and zero unexpected production writes.
2. **Managed video decision:** compare a managed streaming service with private object storage plus a separately hosted worker using current provider quotes, privacy controls, regional latency and budget. User approval is required before paid services are created. Build direct, resumable constrained uploads, callback signature validation, idempotent jobs, private playback, moderation and lifecycle cleanup. Gate: real uploads, failures/retries, access control, cost alarms and verified output renditions, including 4K only when produced.
3. **Moderation and creator safety:** introduce additive job/status/ownership changes with migrations, explicit review queue, limits, audit logging and server-side roles while preserving existing records and fixed admin access. Gate: unauthorized users cannot publish/access drafts; rollback and backup tested.
4. **Player and discovery:** integrate the selected provider's manifest/ABR support with native fallback, accessible controls and resume; improve database-side related/category queries and filters. Gate: actual desktop/mobile playback, slow-network and rendition availability tests.
5. **Accounts and community:** add account-linked creator identities, server-synced lists/history, reversible likes, subscriptions, moderated comments, notifications and deletion. Respect consent and privacy; never manufacture counts. Gate: real Neon integration, ownership and abuse tests.
6. **Polish, metrics, launch:** design tokens and responsive accessibility, first-party measurement with bot/duplicate mitigations, SEO, costs/alerts, performance and load testing, runbooks and deployment verification. Gate: all acceptance scenarios with real services and documented recovery.

## First implementation slice (audit-time status)

- Preview builds now skip automatic schema migration unless explicitly opted in after provisioning an isolated database. This guard is not a substitute for separate runtime credentials; existing Vercel configuration has not been changed.
- Prepared a GitHub Actions workflow template for install, typecheck, lint, unit tests, high-severity dependency audit and a dummy-configuration build. The connected GitHub app cannot create workflow files without the workflows permission; the template is not active until installed in `.github/workflows/` by an authorized account.
- Homepage category shelves now query each category instead of filtering only the newest 48 uploads. Related videos first query the current category and fill unused slots from recent uploads, deduplicating and excluding the current video. Trending calculation and the other discovery gaps remain open.
- Verified the discovery change against an isolated, in-memory PostgreSQL-compatible PGlite database with 55 newer videos and older category matches, using Chromium at 390, 768 and 1440 pixels. This fixture is test data only and was not sent to production. The browser tests do not establish live storage, streaming, auth, or production-device compatibility.
- After these changes: unit tests, typecheck, lint (three existing warnings), and a build with dummy configuration pass. No production migration or deployment was performed.

## Proposed target topology (not yet implemented)

```text
Browser ── authenticated upload session ──> Next.js / Neon Auth
   │                                          │
   ├── direct resumable upload ──> private storage / managed video provider
   │                                          │
   │                                signed webhook / processing worker
   │                                          │
   └── signed playback/CDN <── approved renditions + moderation state
                                              │
                                        PostgreSQL / audit logs
```

## Cost planning, not a quote

No paid service has been enabled. For an initial provider comparison, [Cloudflare Stream](https://developers.cloudflare.com/stream/) offers managed uploads and adaptive H.264 delivery up to 1080p, so it **does not satisfy the requested 4K output**. Its [published prices](https://developers.cloudflare.com/stream/pricing/) include $5 per 1,000 stored minutes per month (capacity in $5 increments) and $1 per 1,000 minutes delivered. At 1,000 stored minutes and 40,000 delivered minutes, the indicative video subtotal is **$45/month**, excluding other services and taxes.

[Mux's published pricing](https://www.mux.com/docs/pricing/overview) describes on-demand up to 4K, free basic-quality input, basic/plus storage of $0.0096 per 4K minute per month in the first tier, and 100,000 free delivered minutes per month. Under those specific assumptions, 1,000 stored 4K minutes and 40,000 delivered minutes indicate **$9.60/month of video usage before account credits**, excluding other services, taxes and paid options. Eligibility, plan terms, actual playback, regional performance and limits must be confirmed before committing. Plus/premium quality input and additional usage can materially change the cost. Self-hosted processing adds worker, storage, bandwidth and engineering/operations costs and offers more control, but requires significantly more operational work. Compare current vendor quotes, 4K output and signed-access features before selection.

Recurring cost depends on stored source/rendition GB-months, transcoded minutes by quality, delivered GB/minutes, CDN region, requests, database compute/storage, observability and retries. Example planning workload: 100 creator uploads of 10 minutes/month = 1,000 source minutes transcoded; if 2,000 viewers watch 20 minutes each, delivery is 40,000 viewer-minutes. At an average encoded bitrate of 3 Mb/s, that is approximately 900 GB of payload before overhead, retries, multiple renditions or provider-specific billing. Actual cost = each measured unit × the selected provider's current regional rate plus minimum plans and taxes; request current quotes before approval. Alert at configurable utilization/spend thresholds and separately track uploads, stored assets, processing failures and delivered traffic. No reliable currency estimate can be given until provider, plan, 4K policy and regional pricing are selected.

## Required environment and operations

See `.env.example` and README for names and setup; never commit or print values. Configure separate direct and pooled database endpoints for each environment, a distinct Neon Auth setup/secret where appropriate, and an explicit production canonical URL. Configure storage credentials only on the server. Back up database and media independently, encrypt and retain them according to policy, practice restoration into a separate environment, and document point-in-time recovery; deployment rollbacks alone do not reverse schema changes. Do not enable cleanup jobs without verifying their provider scope and references. Exact managed-video credentials and webhook setup depend on the provider selected and cannot honestly be finalized yet.
