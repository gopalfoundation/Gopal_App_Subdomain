# CMS Guide

The admin area is available at `/admin` after deployment.

Administrators can update global settings, homepage content, logos, programs, events and articles through friendly forms. Changes are committed to Git and trigger a new static build.

Before launch:

1. Replace `your-org/sita-ram-initiatives` in `public/admin/config.yml`.
2. Configure GitHub authentication through the hosting provider or a GitHub OAuth app.
3. Invite authorized administrators.

Normal content changes do not require editing code.
