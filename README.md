# SITA RAM Initiatives

The approved GOPAL Foundation programs website, retaining its Astro static-first
architecture, responsive initiatives mega menu, RAM and SITA control centers,
programs, articles, videos, testimonials and per-opportunity registration UX.

- Repository: [gopalfoundation/Gopal_App_Subdomain](https://github.com/gopalfoundation/Gopal_App_Subdomain)
- Production: [programs.gloryofpeaceandlove.org](https://programs.gloryofpeaceandlove.org)
- Production branch: `main`; migration branch: `codex/production-programs-migration`
- Firebase Hosting target: `gloryofpeace-landing`

## Develop And Validate

Use Node.js 22 LTS and npm:

```sh
npm ci
npm ci --prefix firebase/functions
npm run dev -- --host 127.0.0.1 --port 4321
npm test
npm run build
```

The local editor's one-time password setup remains local-only. Production uses
server secrets, not the local setup route. See `REGISTRATION-BACKEND-SETUP.md`.

## Architecture

Astro generates crawlable HTML from the approved source. Firebase Hosting serves
assets from `dist/hosting`. The `programsApp` Node.js 22 HTTPS function serves
prebuilt HTML and applies published CMS updates using existing renderers.
It protects Admin and runs existing authenticated registration APIs.
Private Cloud Storage JSON files hold CMS drafts/published content and media;
participant responses stay in the restricted Google Sheet behind Apps Script.
No SQL, Firestore, public spreadsheet, or browser credentials are introduced.

Admin HTML lives only in the function package, never in Hosting's public directory.
Mutable CMS JSON is served by the runtime so static files cannot shadow changes.
Public registration success requires a backend receipt.

The organization starter Firebase target, cache headers and secret/variable names
are preserved. Its dummy index was intentionally replaced by Astro source.
The old empty `pages/` and starter `assets/` are not deployed.

## Content

- `public/content/website.json`: global settings, navigation and homepage seed.
- `public/content/ram.json`, `public/content/sita.json`: initiative/form seeds.
- `src/content/`: existing general programs, articles and events.
- `src/data/testimonials.json`: empty seed; private editorial records stay in storage.
- `src/pages/admin.astro`: simplified Admin; RAM/SITA retain their own tools.
- `integrations/google-apps-script/ram-responses.gs`: private registration provider.
- `firebase/`: runtime adapters, not a redesign of the application.

Online publishing updates private CMS files and public HTML without a code push.
Source/seed changes require review and deployment; existing online records take
precedence. Back up CMS files privately before intentionally replacing them.
Never commit unpublished testimonials or participant responses.

## Status

The production domain was observed serving the starter page on 2026-10-06. The
recorded organization deployment failed due to a missing service-account input.
Migration validation does not prove live deployment. See [DEPLOYMENT.md](DEPLOYMENT.md)
for setup, release validation and rollback.
