# Gopal_App_Subdomain

Static campaign pages for Glory of Peace and Love, hosted on Firebase Hosting.

## Add a campaign page

1. Put each additional HTML page in the generic `pages/` folder, using a descriptive filename such as `pages/web-dev.html`.
2. Start from `index.html`, update the page title, description, heading, content, and links, then adjust asset paths for the page's folder. For a page directly inside one of these folders, link the shared stylesheet as `../assets/css/site.css`.
3. Store images under `assets/images/`; add JavaScript under `assets/js/` only when the page needs behavior.
4. For registration forms, use an organization-approved form endpoint or service. Static HTML alone cannot receive or store submissions.
5. Add and test the page locally, then commit and push it to `main` to deploy it live.

## Test locally

From the repository root, run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/` or `http://localhost:8000/pages/web-dev.html`. Stop the server with `Ctrl+C`.

## Project structure

```text
index.html
pages/
	web-dev.html
assets/
	css/site.css
	images/
	js/
```

Keep the home page at the repository root and put additional HTML pages in `pages/`. Pages one folder deep should use `../assets/...` to reuse shared files. Keep assets in the shared folders rather than copying them into `pages/`.

## Firebase and GitHub setup

The workflow in `.github/workflows/deploy.yml` runs on every push to `main`. It checks out the repository and uses `FirebaseExtended/action-hosting-deploy@v0` to publish the configured Hosting target directly to its live channel. There is no build step because the site is static. A live deploy replaces the current contents of that Firebase Hosting site, so deploys from this repository must contain every page intended to remain available there.

Before the first deploy:

1. In the Firebase project, create or identify the Hosting site. The target alias in `firebase.json` is `gloryofpeace-landing`; it must map to the actual Hosting site ID.
2. Install the Firebase CLI and authenticate, then create the target mapping from the repository root:

	```sh
	firebase target:apply hosting gloryofpeace-landing <hosting-site-id> --project <firebase-project-id>
	```

	Commit the generated `.firebaserc`. If the Hosting site ID is also `gloryofpeace-landing`, use that as `<hosting-site-id>`.
3. In GitHub repository settings, add the Actions variable `FIREBASE_PROJECT_ID` with the Firebase project ID.
4. Add the Actions secret `FIREBASE_SERVICE_ACCOUNT_GLORY_OF_PEACE` containing the service account JSON key. The account needs permission to deploy to Firebase Hosting.
5. Push to `main`. GitHub provides `secrets.GITHUB_TOKEN` automatically; the workflow uses it as the action's `repoToken`.
6. Add and verify the desired subdomain in Firebase Hosting, then configure the DNS records Firebase provides at your domain registrar. The workflow deploys content; it does not configure DNS.

The workflow's `channelId: live` publishes directly to the live site, not a review channel. Confirm the change before merging or pushing to `main`.

## Google Ads and privacy

Only add organization-approved Google Ads tags and real account/conversion IDs. Put the global tag in the page `<head>` and fire conversion events only after a successful conversion. Follow the organization's consent and privacy requirements; never commit credentials or invent tracking IDs. See `.github/copilot-instructions.md` for page and form conventions.