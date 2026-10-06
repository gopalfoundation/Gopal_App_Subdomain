# Migration Validation

Inspection and local verification on 2026-10-06. These results are not a live
Firebase deployment or Google provider receipt.

## Local Results

- Architecture retained: Astro 5 static generation, existing approved UI/models.
- Node 22 LTS; npm lockfiles committed for both source and isolated Functions.
- 67 automated tests pass, covering private CMS, registration receipts, sessions,
  CSRF, response/export behavior, generation-conditional storage and Firebase guard.
- 40 pages built; 1,752 internal links validated.
- Hosting output excludes Admin HTML and mutable CMS JSON, so rewrites cannot be bypassed.
- Production canonical/OG/site/sitemap base changed to programs.gloryofpeaceandlove.org.
- Admin excluded from sitemap; dynamic initiative sitemap reflects publication.
- Functions runtime dependency audit: zero findings. Root build/dev Astro advisories
  remain documented in DEPLOYMENT.md; no clean-root-audit claim.
- Browser QA: 320, 375, 390, 430, 768, 1024, 1280, 1366, 1440, 1536, 1920 pixels.
- Homepage/mega menu, RAM, SITA, initiatives, Community structure and articles show
  no horizontal overflow; local app assets return no 404 and no page errors.
- Direct clean routes and representative article/program details load.
- Mega menu desktop hover and mobile accordion work; no global RSVP nav reintroduced.
- RAM/SITA forms open only for selected opportunities. One video iframe at a time.
  External video playback was not verified; QA isolates external requests.
- Synthetic registration: receipt required, configured popup opens, private Admin
  response visible only after login. This uses a simulated provider, not Google.
- Main Admin draft stays private; publish persists in isolated file-store adapter.
  RAM/SITA control-center navigation retained. Community remains its existing structure.
- The legacy standalone RSVP browser-storage fallback was disabled: no fake
  receipt, no local participant storage or direct Google endpoint. Existing RAM/SITA
  opportunities are the supported registration path. Unmapped legacy forms fail
  closed and direct visitors to open opportunities; they are not live campaigns.

## Unverified Production Items

The live HTTPS domain returns the starter campaign homepage, not this migration.
The recorded GitHub deployment failed before credentials; no verified Hosting
release ID is available. The repository inspection found no project variable,
service-account secret or target mapping. Firebase billing/resource setup is
reported complete, but actual IDs, private bucket, runtime secret and Google
backend require verification. Do not merge merely because branch CI passes.

After authorized setup, verify the real deploy run and Hosting release, then all
production routes, login/CMS, external videos, assets, SEO/mobile and one real
non-sensitive Google registration. Follow DEPLOYMENT.md for rollback and cleanup.
