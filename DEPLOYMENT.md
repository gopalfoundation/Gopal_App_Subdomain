# Production Deployment

## Destination And Build

- Repository: `gopalfoundation/Gopal_App_Subdomain`; production branch: `main`.
- Migration branch: `codex/production-programs-migration`.
- URL: `https://programs.gloryofpeaceandlove.org`.
- Existing Hosting target: `gloryofpeace-landing`.
- Build: `npm ci`, `npm ci --prefix firebase/functions`, `npm test`, `npm run build`.
- Hosting assets: `dist/hosting`.
- Secure runtime: `firebase/functions` (`programsApp`, Node.js 22, `us-central1`).

Hosting retains the existing custom-domain association. Do not change DNS or
create another project/site. Core HTML is prebuilt and crawlable, not a SPA;
the function applies CMS updates and protects Admin before sending HTML.

## One-Time Organization Admin Requirements

As inspected on 2026-10-06, the repository lists no Actions variables/secrets,
has no `.firebaserc`, and its recorded deployment failed at the service-account
input. Firebase setup is reported done but resource IDs and runtime resources
are not yet available to verify. Complete/confirm:

1. Repository variable `FIREBASE_PROJECT_ID`: the existing project ID.
2. Repository secret `FIREBASE_SERVICE_ACCOUNT_GLORY_OF_PEACE`: add privately,
   never commit a JSON key. The deploy identity needs scoped Hosting, Functions,
   Cloud Build/Artifact Registry and service-account use permissions in this
   project. Runtime Secret Manager access must be scoped to its secret.
3. Verify the Hosting site already serving the custom domain. Run
   `firebase target:apply hosting gloryofpeace-landing <existing-site-id> --project <existing-project-id>`
   and commit `.firebaserc`. A target alias is not proof of a site ID.
4. Confirm Blaze is already enabled and approve runtime/storage usage and spending
   limits. Cloud Functions and Secret Manager have usage costs; this migration
   does not upgrade billing or create a project.
5. Set repository variable and function parameter `CMS_BUCKET` to an approved
   **private** Cloud Storage bucket in the same project. Enforce public-access
   prevention and uniform bucket-level IAM; grant the runtime identity access
   only to CMS/media objects. Do not grant public bucket access. Do not infer a
   default bucket. No Firebase client storage SDK is used.
6. Privately create Secret Manager secret `SITARAM_SERVER_CONFIG`, a JSON object
   containing `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`,
   `REGISTRATION_BACKEND_URL`, `REGISTRATION_BACKEND_SECRET`:
   `firebase functions:secrets:set SITARAM_SERVER_CONFIG --project <existing-project-id>`.
   Generate PBKDF2 credentials using `node scripts/create-admin-credentials.mjs`
   in a private terminal, not chat/issues. An unset backend remains an error.
7. Create/deploy the Apps Script and restricted Sheet if still absent; follow
   `REGISTRATION-BACKEND-SETUP.md`. Configure identical backend tokens in script
   properties and the server secret. Never expose credentials to the browser.

The production workflow writes the nonsecret `CMS_BUCKET` parameter to an ignored
function dotenv file. Four private values are read only from Secret Manager at
runtime. The actual project/bucket/resource state requires organization access.

Production sessions use the signed, HttpOnly, Secure, SameSite `__session` cookie:
Firebase Hosting strips other cookie names before its function rewrite. The
original local editor keeps its existing cookie. See [Firebase cookie routing](https://firebase.google.com/docs/hosting/manage-cache).

## Release Flow

1. Work on a feature branch, test/build locally, push and open a PR.
2. `ci.yml` validates source and output without production credentials. Builds
   use committed curated feeds (`SKIP_VIDEO_SYNC=true`) for reproducibility;
   runtime feed refresh retains manual curation.
3. Review HTML/mobile behavior and private API tests. Do not merge until resource
   configuration, permissions and the existing live release are verified.
4. On `main`, `deploy.yml` repeats install/tests/build and fails closed on missing
   project, credential input, private bucket or target mapping. It deploys only
   the `gopal-programs` Functions codebase, then uses the existing
   `FirebaseExtended/action-hosting-deploy` action for `gloryofpeace-landing` live.
5. Hosting `pinTag` pins runtime code to its release, supporting code rollback.
   Secret/CMS changes require separate deliberate management.
6. Verify the real custom domain before declaring success.

PR CI never deploys Functions or overwrites live Hosting. Preview channels are
not verified/automated yet. After setup, an authorized operator can deploy a
branch runtime then a preview channel, ensuring live is already pinned. Preview
login requires a separate explicit trusted origin/config; do not weaken origin
checks to accept arbitrary domains. Thorough local validation is available.

## Local Preview

After building, `npm run preview:firebase` serves production-adapter HTML/assets
at `http://127.0.0.1:4322`. It uses isolated temporary CMS memory and requires local
private credentials for sign-in; it does not write to a production bucket. Real
Google requests are disabled in this preview. Use Astro dev on port 4321 for
the original local content-editor workflow.

## Live Checks

Verify direct open/refresh: `/`, `/ram`, `/sita`, `/programs`, `/community-programs`,
`/articles`, detail routes, `/about`, `/resources`, `/get-involved`, `/contact`.
Check canonical/OG URLs, `/sitemap-index.xml`, `/robots.txt`, HTTPS and all assets.
Check hover/keyboard mega menu, mobile accordion, one active YouTube iframe,
testimonials/forms and Admin across the requested 11 viewport widths.

Anonymous Admin must redirect to sign-in; responses, drafts and uploads must deny
anonymous access. Verify signed-in control centers, draft preview, persistent
publishing and per-opportunity success preview. No private data in Git/analytics.

Submit one clearly labeled non-sensitive test participant through production.
Verify receipt, configured success popup, private Sheet row and Admin response;
test internal status and CSV. Remove the synthetic row if appropriate. These
checks cannot be claimed before configuring the real provider and runtime.

## Rollback

Repository baseline: `e0b4c30d2e6547aa2877006d22d14dfec6369d7d`.
Deploy run `36980433104` failed; it is **not** a verified Hosting release. The live
starter may have been deployed manually, but this is unconfirmed. Before touching
live, record the actual Firebase release ID and retain it in the Firebase console.
Use its Hosting release rollback on critical failure. Pinned runtime code follows
the Hosting release; retain the referenced runtime revisions.

Back up/restore CMS objects separately: Hosting rollback does not roll back Cloud
Storage or Sheet data. Source rollback is a reviewed revert PR, never a force push.
The original workspace has source/history backups under ignored
`.astro/backups/production-migration-20261006/`.

References: [Hosting Functions](https://firebase.google.com/docs/hosting/functions),
[secret configuration](https://firebase.google.com/docs/functions/config-env),
[Node runtimes](https://firebase.google.com/docs/functions/manage-functions).

## Dependency Review Boundary

The isolated deployed Functions package has a zero-finding npm runtime audit.
Compatible SDK updates and a scoped `gaxios` UUID v4 dependency patch were applied.
The Astro 5 build/dev toolchain still reports advisories; clearing the package
advisory ranges requires a major Astro upgrade, which is not hidden inside this
no-redesign migration. Astro/Sharp/esbuild are not shipped in the function package.
The Astro image service is explicitly no-op, approved assets use plain img tags,
and the Firebase runtime has no image-optimization or Astro SSR endpoints.
This mitigates the AVIF-processing path; it is not a claim of a clean root audit.
Only use loopback Astro dev, trusted build content and private build environments.
Review a separately validated Astro upgrade before enabling Astro SSR, image
processing, dynamic attribute names, server islands or exposing development.
See the [Astro AVIF advisory](https://github.com/advisories/GHSA-26w7-cxv4-gfx2)
and [Astro SSR advisory](https://github.com/advisories/GHSA-2pvr-wf23-7pc7).
