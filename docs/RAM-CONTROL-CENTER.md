# RAM Page Control Center

Open `http://127.0.0.1:4321/admin/ram/` while the local website server is running.

Each tab controls its corresponding RAM section. SITA and Community Programs keep their existing editors.

## Drafts and publishing

Save Draft preserves your work without changing the public RAM page. Preview opens the saved draft within the control center. Publish Changes writes RAM content to `public/content/ram.json` and updates the local website. Drafts are saved separately in `.astro/ram-draft.json`. The hosted site receives changes on its next website release; this local editor does not publish to hosting.

Program and article detail pages are generated with their own titles, descriptions and canonical URLs. New records become available in the local server after publishing, and in the hosted site after a new build/release.

## Opportunities and forms

A program can have many opportunities. Opportunities have an independent status, date window and associated form. Create an opportunity from Registrations, select a program, and edit, create or duplicate the associated RSVP form. Registration, waitlist and future-interest forms can have different questions and confirmations.

Duplicating an opportunity copies its form and confirmation configuration to a new draft with an independent form ID. Participant responses are never part of the duplicate or content files.

Launch activates the chosen registration type. Scheduled opportunities open at their configured date and close at their closing date. Time pickers use the opportunity's selected timezone. Closing or archiving an opportunity leaves its permanent program intact.

## Registration delivery

The RAM page requires a confirmed response from the configured service before displaying success. It does not save participant responses in content files, Git or browser storage.

By default RAM uses the existing shared RSVP adapter in Admin > RSVP Forms. To use a separate service, turn off Use Shared RSVP Settings in RAM > Registrations and enter its HTTPS address.

The service receives JSON in a POST with content type `text/plain;charset=utf-8`. It must support browser requests and return JSON with `success: true` or `ok: true` after storing the registration. Failed requests, HTML login pages and negative acknowledgements show an error and keep the form available. The request includes a stable `submissionId` for deduplication on retries; the service should use that ID to prevent duplicate entries.

Participant records belong in a private destination, such as the existing Google Apps Script/private Sheet adapter. No service is configured by default, so the starter opportunities are for review until real dates and registration delivery are confirmed. Draft previews disable submissions entirely.

## Videos

Add individual YouTube URLs or enter RAM's actual channel ID and select Import Latest Videos. Manual featuring overrides the latest-video mode. Hidden videos stay hidden when their feed is imported again.

Automatic Latest Videos uses the free YouTube Atom feed at build time, without a paid service or API key. It refreshes when the website builds; it does not continuously poll the hosted site. If YouTube is unavailable, the last curated selection remains. Only the clicked player loads an iframe. The supplied RAM channel is connected; playlist selection plays in the same player. Duration is optional because RSS does not provide it.

The optional `ram-feed-refresh.yml` workflow builds once daily only when the repository variable `RAM_DAILY_REFRESH` is `true`; it also supports manual runs. It produces a refreshed static artifact, without automatically deploying it or changing hosting providers. Attach your authorized release process to publish that artifact. Daily refresh is not enabled by default.

## Private Responses

Registrations > Responses reuses your SITA RAM portal session, with no second password form. See [registration backend setup](../REGISTRATION-BACKEND-SETUP.md) for the private Google Sheet adapter and serverless runtime configuration. Edit an opportunity and choose After Submission to configure its success popup independently of its question form.

## Images

Upload or select images through the visual library. Uploads are limited to PNG, JPEG and WebP, 5 MB per image, and saved in `public/uploads/ram/`. Alt text is edited next to the image preview. Images are included in future website builds.

## Local access

The editing service runs only in Astro's development server, accepts local hosts and same-origin JSON writes, and is absent from the static hosted build. Keep the local server bound to `127.0.0.1`. A hosted multi-user editor would require a separate authenticated publishing service.

## Verification

Run `node --test scripts/ram.test.mjs` for opportunity availability, form separation, duplication, timezone handling and acknowledgement checks. Run `pnpm build` for Astro validation, static pages and link checks.
