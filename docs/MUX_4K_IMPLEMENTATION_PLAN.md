# VELTRIO Mux 4K pipeline — implementation plan

Status: **design and disabled server-side foundation only**. No Mux resources, uploads, paid usage, or database migration have been created by this work. Deploying the foundation does not enable a working upload pipeline. Existing local and admin Blob paths remain untouched.

## Goals and constraints

Use Mux for direct resumable uploads, asynchronous processing and adaptive HLS playback. Keep Vercel/Next.js, Neon Auth and the existing PostgreSQL database; preserve existing videos and the separate fixed admin account. Public creators stay disabled until quotas, review, private playback and real integration tests are complete. The default maximum resolution is 1080p; 4K (`2160p`) is an explicit operator choice because it can raise costs. Even when 4K is selected, the UI must show it only if Mux reports that an actual 4K rendition is available for that asset and the device can play it.

## Target flow

```text
creator browser --authenticated metadata--> VELTRIO /api/creator/...
       |                                       | reserve quota + create owned draft/job
       |<-- one-use direct upload URL ---------+ Mux Video API (signed playback)
       |-- resumable chunks ------------------> Mux (no video bytes via Vercel)
       |                                       |
       |              signed, verified webhook | processing / failure / ready
       |                                       v
       +-- owner polls job status <-------- PostgreSQL job + moderated draft
                                               |
moderator approves + owner requests publish --> publication transaction
                                               |
viewer <-- Mux HLS manifest / segments <-- short-lived signed playback token
```

A signed playback ID does not itself confer access. Server-issued, short-lived playback and thumbnail tokens must be authorized per request: public only for approved published videos; drafts for their owner/admin only. Never store upload URLs, access tokens, or signing private keys in public rows, logs, browser local storage, or analytics. Avoid leaking provider IDs and payloads where not needed. Resolve stream and image host access/CORS and test token refresh for long playback; do not proxy large files through serverless functions.

## Implementation sequence and release gates

1. **Isolation and provider setup.** Create separate Neon database branches and separate Mux environments for development/preview and production. Set server-only credentials, webhook secrets and playback signing keys per environment; specify the exact application CORS origin. Configure Mux test assets on non-production and modest budget thresholds. Confirm backups/restore and rotate any previously exposed DB credential. No external resource should be provisioned or billed without owner approval.
2. **Additive persistence.** Add a dedicated owned upload/processing record with stable internal ID, owner, reserved size, intended resolution cap, Mux upload ID and asset ID, signed playback ID, status, verified duration/resolution, timestamps and error category. Unique constraints for provider IDs and processed webhook IDs; indexes for owner/status and reconciliation. Link to existing videos without changing or deleting legacy assets/rows. Use additive Drizzle migrations and test forward/rollback compatibility in an isolated copy before any deployment. No final database schema is committed yet.
3. **Authorization and quotas.** Authenticated, same-origin session initiation validates metadata, allowed formats, rights confirmation, per-user limits, active upload count and estimated spend. Reserve quota transactionally before requesting a provider URL; expire reservations via a documented job. Do not trust browser-reported dimensions, duration, MIME or size as final facts. Upload URLs are bearer secrets: return with `no-store`, bind CORS to a configured origin, limit validity and never log them. Ensure retries cannot create unbounded billable resources; reconcile/cancel partially created sessions.
4. **Upload UX.** Add a Mux-backed path alongside—not in place of—the existing provider paths. Use Mux's resumable chunk client with progress, pause/resume, cancel and retry. Avoid incorrectly promising resume after token expiry; reconcile against server and provider state. Enable the new path only when all launch gates pass. Handle abandoned uploads/finished unattached assets and deletion with verified ownership and idempotent cleanup.
5. **Webhook and reconciliation.** Expose a bounded raw-body POST route, verify `Mux-Signature` using the official SDK before parsing, and use a persistent unique event ID plus transactional state changes. Treat provider timestamps and sequence ordering as non-monotonic: fetch authoritative asset state as necessary, prevent duplicate processing, protect against stale ready events, and ensure deleted/blocked jobs cannot become public. Verify Mux environment and correlation IDs. Retry DB failures with non-2xx; acknowledge safely ignored, validated events. Implement periodic reconciliation for missed callbacks and timed-out or failed uploads. Processing errors are private and actionable; preserve operational diagnostics without leaking secrets.
6. **Moderation and publication.** Signed assets remain private by default; verified processing success alone never publishes. Add a real review queue with administrator actions/audit records, rights checks, takedown and account restrictions. Only publish atomically when ready, approved and ownership is valid. Preserve existing admin workflows; no implicit permission upgrades to new users.
7. **Playback and thumbnails.** Add the Mux HLS player or equivalent maintained HLS client while retaining the existing native/local path. Support automatic and available manual quality levels, mobile controls, keyboard accessibility, subtitles/tracks when provided, error recovery and refresh of expiring signed tokens. Integrate existing opt-in analytics without double-counting, preserve reduced-motion/theme support, and avoid download buttons unless a supported authorized rendition exists. Do not claim DASH or 4K if the configured provider output does not offer it.
8. **Observability, cleanup and security.** Track upload/session states, processing failures and delays, estimated/actual provider storage and delivered minutes; configure provider alerts and a kill switch before public beta. Monitor webhook errors, duplicate/out-of-order events, token failures and quota anomalies. Restrict who can use 4K, cap file sizes/durations and clarify that provider billing may differ from estimates. Perform security review, backup restore and load/slow-network tests.
9. **Verification and rollout.** Unit-test state transitions and signatures, then run integration and browser tests using isolated database/Mux test assets for unauthorized access, cancellation, retries, late/duplicate webhooks, processing errors, moderation, real 1080p/4K playback, absent 4K rendition, token expiry, desktop/mobile, recovery, and privacy. Real provider tests require configured accounts and cannot be represented by mocks. Deploy behind a disabled flag; enable for a small verified beta only after passing the gates. Never publish a production migration from a preview build.

## Proposed configuration (all server-only unless stated)

- `MUX_ENABLED`: false unless explicitly enabled after the launch gates; the current foundation is not connected to user routes even if configured.
- `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`: Mux API credentials with the minimum available privileges, never browser-exposed.
- `MUX_WEBHOOK_SECRET`: signature-verification secret for the matching Mux environment.
- `MUX_PLAYBACK_SIGNING_KEY_ID`, `MUX_PLAYBACK_PRIVATE_KEY`: signing credentials used to generate authorized playback/image tokens; store as sensitive environment secrets. The private key must never appear in a public variable.
- `MUX_CORS_ORIGIN`: exact HTTPS browser origin. Separate values for production and each supported preview; no wildcard. Local HTTP is permitted only for localhost/loopback development.
- `MUX_MAX_RESOLUTION`: `1080p` by default, optionally `1440p` or `2160p`. This is a cap, not an assertion about the generated rendition.
- `MUX_TEST_MODE`: optional `true` to create test assets; non-production is always test mode in the foundation.

Provision these in the hosting dashboard, not in chat or source control. Create separate Mux test/production environments and configure a webhook endpoint **only when the endpoint has actually been implemented and deployed**. Use the Mux dashboard to generate API keys, a webhook signing secret, and a playback signing key, then set them as sensitive server-side Vercel variables for the appropriate target. Configure the future webhook URL at the production or isolated preview origin once available; there is currently no endpoint to register.

## Cost model and decision

See [audit cost comparison](PLATFORM_AUDIT_AND_ROADMAP.md#cost-planning-not-a-quote). Mux's published example assumptions in that report are about $9.60/month for 1,000 stored 4K minutes and 40,000 delivery minutes before credits, optional features, other services and tax. This is not a quote, forecast or cap; output quality, retention, delivery beyond free allowances, account terms and pricing changes affect the bill. Obtain current provider pricing and configure real alerts and manual/automatic usage gates before enabling uploads. Initial release should default to 1080p to avoid unexpected 4K storage costs.
