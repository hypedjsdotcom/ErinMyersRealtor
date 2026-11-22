# Erin Myers Real Estate CRM

Private, two-user Netlify CRM for contacts and transaction management.

## Features
- Shared persistent contacts with name, phone, email, buyer/seller/both, stage, property, lead source
- Notes and timestamped activities
- Follow-up dates and reminder dashboard (shown upon login, not SMS/email notifications)
- Buyer/seller contract-to-close checklists, custom tasks and completion progress
- Search, filters, transaction cards, CSV export
- Server-side login sessions using HttpOnly cookies
- Netlify Blobs (site-wide store) to persist records across browser sessions and deploys

## Deployment (recommended: Git-connected Netlify)
1. Extract this ZIP and upload folder to a **private GitHub repository** (do not publish real client data in code).
2. In Netlify, choose **Add new project > Import an existing project**, select the repository.
3. Netlify reads `netlify.toml` and installs packages with `npm install`.
4. In **Project configuration > Environment variables**, set:
   - `CRM_SESSION_SECRET`: a long random secret, at least 32 characters. For example, generate with `openssl rand -hex 32` on your Mac. Never paste your secret into public code.
   - `CRM_ERIN_PASSWORD`: choose a new strong password (rather than the initial requested `myers`).
   - `CRM_MIKE_PASSWORD`: choose a new strong password (rather than the initial requested `bedko`).
5. Deploy. Open your Netlify site. Sign in with usernames `erin` and `mike` and the passwords configured above.
6. Invite Erin and Mike to bookmark the site. Both accounts see the same data.

**For initial private testing only:** If you omit the two password environment variables, the server uses the requested demo passwords: `erin` / `myers`, `mike` / `bedko`. Change them **before entering real client information**. `CRM_SESSION_SECRET` must always be configured; login will not work without it.

Manual Netlify Drop is intended mostly for static content and may not correctly bundle server functions/dependencies. Use a Git-based deployment for this project.

## Local development
Run `npm install`, create `.env` with `CRM_SESSION_SECRET` and passwords, then `npx netlify dev`. A Netlify local development environment is needed for Blobs emulation.

## Data and limitations
Netlify site-wide Blobs are persistent across deploys, but there is **no absolute forever guarantee**: project deletion, provider policies, accidental manual deletion, or account loss can affect availability. Export CSV regularly and maintain secure backups. Data is isolated by the Netlify site's store, not saved in the browser. There is no automatic SMS/email reminder dispatch; reminders appear in the CRM. Edits to the same contact concurrently can overwrite one another, so avoid two people editing the same client at once. The application is a practical small-team starter, not a compliance-certified real estate transaction or document management system. For confidential documents, state-required record retention and regulated information, select a compliant dedicated platform. Do not store SSNs, payment data, financial details or sensitive personal records in notes.

To reset a user's sessions after password changes, rotate `CRM_SESSION_SECRET` and redeploy. Use HTTPS Netlify-hosted domain.
