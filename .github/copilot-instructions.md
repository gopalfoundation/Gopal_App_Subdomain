# Repository Instructions

- The approved production migration retains the existing Astro static-first website. Edit source in `src/` and public assets in `public/`; do not hand-maintain generated HTML or reintroduce the starter homepage.
- Build with `npm ci` and `npm run build`. Firebase serves `dist/hosting` assets plus the `programsApp` HTTPS function for prebuilt HTML, protected Admin, private CMS and registration APIs. Never upload Admin HTML or mutable CMS JSON as unguarded Hosting files.
- Preserve target `gloryofpeace-landing`, the existing organization Firebase project, and domain `https://programs.gloryofpeaceandlove.org`. No DNS or billing changes without organization approval. Follow `DEPLOYMENT.md`.
- Use semantic HTML, one descriptive page title and primary heading, a unique meta description, responsive layouts, keyboard-accessible controls, visible focus states, and meaningful image alt text. Test narrow and wide viewports.
- Keep pages fast: avoid unnecessary scripts and third-party requests, optimize and appropriately size images, lazy-load below-the-fold images, and set image dimensions to reduce layout shifts. Prefer local assets where practical.
- Only add Google Ads tags or conversion snippets supplied or approved by the organization. Put the global tag in the document head, use the real account/conversion IDs, and trigger conversion events only after the corresponding action succeeds. Never invent IDs, duplicate tags, or include secrets in client-side code. Follow the organization's consent and privacy requirements.
- A static HTML form cannot securely process or store registrations by itself. Connect forms only to an approved form service or backend; do not imply a submission succeeded until the endpoint confirms it, and do not collect unnecessary sensitive data.
- Keep changes focused on the campaign being edited. Do not change Firebase deployment settings or shared pages as part of an individual campaign unless required and coordinated.
