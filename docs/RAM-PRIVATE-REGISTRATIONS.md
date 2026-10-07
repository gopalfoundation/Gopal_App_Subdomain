# Private RAM Registrations

Follow [Registration Backend Setup](../REGISTRATION-BACKEND-SETUP.md) for the current
environment-variable configuration, Google Apps Script code, single portal login,
serverless deployment, and live test checklist. It replaces the old
`.ram-private.json` / response-only password configuration.

Responses stay in one private Google Sheet. The browser uses authenticated,
same-origin APIs for filtering, details, statuses, counts and CSV export. Public
forms use a same-origin submission proxy and wait for confirmed storage before
showing opportunity-specific success content. Configuration stays Git-based;
participant information must never be committed or sent to analytics.
