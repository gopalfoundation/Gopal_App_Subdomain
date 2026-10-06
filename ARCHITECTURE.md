# Architecture

## Principle

The approved site retains Astro static-first generation and Git-managed seeds.
Firebase Hosting serves assets; a minimal secure Node function serves prebuilt
HTML with CMS updates, protected Admin and registration APIs. Private Cloud
Storage JSON replaces the former hosting provider's file storage. Responses stay
in the approved Apps Script/Google Sheet backend. No SQL or paid CMS subscription
is introduced. See `DEPLOYMENT.md`.

## Structure

- `src/pages/` contains routes
- `src/components/` contains shared UI
- `src/layouts/` contains the base document layout
- `src/data/` contains global editable JSON data
- `src/content/` contains Markdown content
- `public/` contains images, logos, admin assets and uploads

## Optional Services

Analytics, external registration forms and donation destinations are optional. The site should continue to work if those services are removed.
