# Video Hub

A self-hosted video library with a private creator studio. Next.js App Router, PostgreSQL/Drizzle, directly uploaded media, and original Video Hub branding.

## Administrator

- Sign in at `/admin/login` using **alomukhtar@playhub.vom** and the provisioned temporary password.
- There is no registration, Google login, OAuth, or social sign-in.
- Change the password in `/admin/settings`. Passwords are salted with scrypt; only hashes are stored in PostgreSQL.
- Sessions are random, hashed in the database, HttpOnly, SameSite=Strict by default, secure in production, and expire after 12 hours. `ADMIN_EMBEDDED_PREVIEW=1` enables Secure, SameSite=None, partitioned cookies for the embedded sandbox preview; disable it for a standalone deployment. Mutation endpoints validate request origin. Configure appropriate frame-ancestor restrictions for your own production domain if you do not need embedding.
- Generate a one-time recovery code in Settings and save it in a password manager. The login page's **Forgot password?** flow consumes this code. No email is sent and no email provider is required.
- If both password and recovery code are lost, the **server owner** can set `ADMIN_INITIAL_PASSWORD` to a fresh secret and run `npx tsx scripts/admin-recovery.ts`. This requires trusted shell and database access and revokes all existing sessions.
- `ADMIN_INITIAL_PASSWORD` is otherwise only used for first provisioning. Restarting the app does not reset an existing password.

## Direct-upload workflow

1. Admin → Upload video → choose an MP4 or WebM (up to 2 GB).
2. The browser captures a thumbnail. Optionally upload a JPG, PNG or WebP image (up to 10 MB).
3. Add a title, description and category. Choose private Draft or Published. Publishing requires acknowledgement of ownership/licensing and content guidelines.
4. Files upload in 4 MB chunks to authenticated route handlers, outside the public directory. If interrupted, retry on the same page, or reselect the same file in the same browser tab/session to resume.
5. File signatures and sizes are validated. Published video pages stream local files with HTTP Range support. Draft/unattached media can only be read by the administrator.
6. Manage titles, thumbnails, featured status, visibility and deletion in the library.

No external video platform links, Telegram webhooks, downloaders or import services are used. Old Studio URLs redirect to `/admin`. Existing old database records are retained for safety, but are excluded from the new public/admin catalog.

## Persistent storage — required for deployment

Set `UPLOAD_DIR` to a writable persistent disk path and `UPLOAD_STORAGE_GB` to a realistic quota (default 10 GB). In this sandbox uploads use `.data/uploads`.

**Do not deploy this storage backend onto an ephemeral/serverless filesystem.** Videos would disappear on restart/redeploy. Use a single Node server with a persistent disk, or a shared persistent filesystem if horizontally scaling. Back up the upload directory and PostgreSQL together. Set reverse-proxy request limits above 4 MB and appropriate timeouts. No video transcoding is performed: H.264/AAC in MP4 is recommended for broad compatibility; codecs must be playable by the visitor's browser.

Upload metadata, including filenames, sizes, received offsets and ready status, is stored in PostgreSQL. The server streams rather than buffering entire videos. Upload progress is tracked by completed chunks; thumbnails are generated in the browser.

## Branding

Original folded-play V monogram, charcoal/ember colors, locally bundled Outfit/Manrope fonts, and original generated cinematic artwork. An accessible short introduction runs once per browser session; reduced-motion is respected. Replay or disable it in Settings. Branding is original and does not copy Netflix's logo or sound.

## AdSense

Existing ad placements are retained and hidden until a valid approved publisher ID and slot ID are configured in environment variables. See `.env.example` and `/adsense-setup`. There are no ads in the admin workspace. Configure a Google-certified CMP where required before enabling ads. Approval, coverage and revenue are not guaranteed; content rights and quality remain the publisher's responsibility.

## Setup and validation

1. Configure `.env` using `.env.example`.
2. Install dependencies, start the platform environment, and run `npx drizzle-kit push`.
3. Run `npx tsx src/db/seed.ts` (categories only).
4. Validate with `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`.
5. Use the platform-managed build/start task.

See `scripts/verify-upload.ts` for local integration tests, `scripts/verify-browser.mjs` for the real browser upload/playback test, and `scripts/admin-recovery.ts` for server-owner recovery. Browser tests need Playwright Chromium and its OS dependencies (`npx playwright install --with-deps chromium`). Run credential-change integration tests only in a disposable development database with `TEST_CREDENTIAL_CHANGES=1`; they revoke sessions and restore the provisioning password.
