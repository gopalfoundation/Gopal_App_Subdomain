# Registration Backend Setup

The code is ready for a private Google Sheet. Google setup is required before
registrations can succeed. No database or paid CRM is used.

## One-Time Setup

1. Open the local `/admin/` page and select **Set Up Admin Access**. Choose and
   confirm your **single SITA RAM portal password** (at least 12 characters), then
   sign in. Google setup is not required to edit the website. This local-only,
   one-time page creates ignored `.env.local` with generated secrets and a password
   hash; it cannot reset an existing admin password. Do not share this file or
   paste its contents into chat. As a terminal alternative, run
   `powershell -ExecutionPolicy Bypass -File scripts/setup-ram-private.ps1`.
2. Create a Google Sheet named **SITA RAM Registrations**. Keep sharing **Restricted**;
   only trusted administrators may be editors. Copy the Sheet ID from its URL
   (`/spreadsheets/d/THIS_IS_THE_ID/edit`). One Sheet supports multiple initiatives.
3. In the Sheet, select **Extensions > Apps Script**. Replace `Code.gs` with
   `integrations/google-apps-script/ram-responses.gs` from this project. Save.
4. Open **Project Settings > Script Properties**. Add:
   `REGISTRATION_SHEET_ID` = the Sheet ID;
   `REGISTRATION_BACKEND_SECRET` = the identically named value in `.env.local`.
   The website never needs the Sheet ID or Google account credentials.
5. Select **Deploy > New deployment > Web app**. Set **Execute as: Me** and
   **Who has access: Anyone**, authorize your own Sheet access, then deploy.
   This makes the script endpoint reachable by the website server, **not the
   spreadsheet public**. Every action, including reads, requires the secret.
   Anonymous requests without it are rejected. If your Workspace forbids this
   deployment option, ask its administrator; do not make the Sheet public.
6. Copy the Web app URL ending in `/exec` (not `/dev`). Privately set
   `REGISTRATION_BACKEND_URL` in `.env.local`. Restart the local server:
   `npm run dev -- --host 127.0.0.1 --port 4321`.
7. For Firebase production, privately store the four credential/backend values in
   Secret Manager JSON secret `SITARAM_SERVER_CONFIG` as documented in
   `DEPLOYMENT.md`. The runtime fixes the origin to
   `https://programs.gloryofpeaceandlove.org`. Keep private values out of browser
   variables and Git. One password covers Admin and Responses.
8. Build with `npm run build`, deploy the `gopal-programs` Functions codebase before
   Hosting target `gloryofpeace-landing`, using the organization workflow.
   Assets: `dist/hosting`; protected HTML/APIs: `firebase/functions`.
   Do not deploy a static-only ZIP or bypass the authorization rewrite.
9. Visit `/admin/ram/`, sign in **once**, then select **Registrations > Responses >
   Test Connection**. Expect **Connection Successful**. No second response password
   is requested. Sessions expire after 30 minutes; rotate `ADMIN_SESSION_SECRET`
   to revoke all sessions. Close private tabs on shared computers.
10. Open `/ram/`, choose an open opportunity, fill its form with a clearly labeled
    test participant and submit. Expect its configured success modal **only after
    storage acknowledges success**. In the Sheet, confirm one row in the
    automatically created **Master Responses** tab.
11. In Admin Responses, confirm the test row, all answers and consent. Change
    **NEW > CONFIRMED**, refresh, and export CSV. Confirm the changed status and
    test row appear. Check the opportunity's actual response count.

Google's deployment instructions: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web).
Asset routing: [Firebase Hosting Functions](https://firebase.google.com/docs/hosting/functions).

## Failure / Retry Check

Temporarily set an incorrect backend secret in the **test environment**, then
submit. Expect "We could not confirm your submission. Please try again.", retained
inputs, and no success modal. Restore the secret and retry. A repeated submission
ID creates only one Sheet row, even if an earlier acknowledgment was lost.
Do not test outages against an active registration campaign.

## Configuration And Data

- Git stores page/program/opportunity/form definitions and success content only.
- The Sheet stores server timestamps, stable IDs, participant identity, internal
  status, and question-label/type/value snapshots. New questions need no manual
  columns. Custom answers are retained in **Answer Snapshot** JSON.
- Internal statuses never change the public opportunity's status. Historical
  responses retain submitted titles and questions even when definitions change.
- Admin APIs are same-origin, authenticated, no-store, and never return credentials.
  Public submissions use `/api/ram/registrations/submit` or
  `/api/sita/registrations/submit`; the browser never calls
  Apps Script directly. Personal data is not written to Git, localStorage, or analytics.
- RAM, SITA, website settings and shared testimonials support online drafting,
  preview and publishing via private Cloud Storage JSON, not a SQL database.
  Storage holds website content/media only, never participant responses.
  Local content editing still requires a release to update the hosted website.
  See [SITA Control Center](docs/SITA-CONTROL-CENTER.md).
- Basic request/body limits and per-process/isolate rate limits are enforced;
  Apps Script adds a script-wide submission cap. At high volume, enable your host's
  edge rate limiting. Google quotas still apply; this is intended for modest volumes.
- Keep the **Master Responses** header row intact. Older deployments using **RAM
  Responses** need a private migration before switching; do not delete existing rows.
- After changing script code, **Deploy > Manage deployments > Edit > New version**.
  Saving code alone does not update the deployed web app.

## Verification Boundary

Automated tests exercise the real adapter code against simulated Google services,
including acknowledgment, authorization, dynamic answers, idempotency, filtering,
status persistence, and CSV escaping. They do **not** prove your Google deployment
is connected. Complete steps 9-11 with your configured private Sheet for live
end-to-end verification.
