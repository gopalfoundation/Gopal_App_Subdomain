# SITA Page Control Center

Open `/admin/sita/` and sign in using the shared administrator password. This is separate from `/admin/ram/`; SITA edits do not change RAM programs, forms or page settings.

## Content Workflow

Use Hero, About, Featured Programs, Registrations, Journey / Why It Matters, Videos, Articles, Testimonials, Get Involved, Images / Media, SEO and Page Settings. Apply Changes closes a record editor. Save Draft preserves unpublished changes. Preview opens the draft. Publish Changes updates the website being edited.

SITA and testimonials support hosted editing. Firebase stores private CMS JSON and images in Cloud Storage, not a SQL database. Seeds remain in source control; online overrides survive releases. Public requests never receive testimonial drafts. Local editing requires a source release. RAM and website settings also support the private-file publishing model in production.

## Programs and Opportunities

Programs remain available when registration closes. Each opportunity has its own type, schedule, form and After Submission settings. Duplicate Opportunity creates a separate draft and form. No real batch dates have been supplied; the initial opportunities collect future interest without invented dates.

Create or edit an opportunity, select its RSVP form, then use Edit Selected Form to add, remove or reorder custom questions. Use After Submission to configure and preview the confirmation experience. Success appears only after the private backend acknowledges storage. Failed submissions retain entered answers for retry.

Program pages support description, audience, educational themes, journey, schedule and FAQs. Associate videos and articles with a program to show them there. Hosted program/article pages are generated from published CMS content, including newly added records. Local changes create static pages during the next release. Program pages start with search indexing disabled until their content has been reviewed.

## Video Sources

Choose Channel, Playlist or Manual Curation. Channel feeds need a channel ID, playlist feeds need a playlist ID, and manual videos need YouTube URLs. Imported metadata uses the free YouTube Atom feed; no paid API is required. Automatic import happens during local builds and refreshes on hosted page visits with a ten-minute server-side cache. Curated metadata is retained if YouTube is unavailable. Use Import Latest Videos to bring feed records into the editor for individual curation. SITA videos remain unpublished until an organization-owned source is supplied.

## Testimonials

RAM and SITA each have a Testimonials tab, backed by one shared testimonial collection. Associate feedback with one or more initiatives and optionally with a program. Add only genuine feedback. Confirm permission for the name, quote and any photo before marking it Published. Archive or unpublish to remove feedback from public pages.

The public section is hidden by default and contains no fabricated reviews. Enable Show Public Section in Testimonials, apply the section settings and publish testimonials. SITA Page Settings can also hide the section. Draft feedback is kept outside public content files; the public API returns only published, consent-approved records and allowed fields.

## Private Registrations

Follow [Registration Backend Setup](../REGISTRATION-BACKEND-SETUP.md). RAM and SITA use the same Apps Script deployment, private spreadsheet and server-only credentials. SITA stores `initiative=SITA`; RAM continues storing `initiative=RAM`.

Registrations > Responses provides program and opportunity filters, search, dates, sorting, complete answer details, internal statuses and CSV exports. Status changes are internal and do not alter the public registration opportunity. No real Google connection has been configured or tested yet. Automated integration checks use the actual Apps Script code with simulated private storage, not a real Google Sheet.

## Verification

Run `npm test` and `npm run build`. Secrets belong in the ignored local environment and production Secret Manager, never in public content or chat.
