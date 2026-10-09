# Team integration

The main branch combines GPS tracking, authentication/user journal, conductor and simulated payments, Lost & Found (images/comments/likes), and authority officer management. Member branches are preserved.

## Run in VS Code

1. Install the locked dependencies from the repository root: `pnpm install --frozen-lockfile`.
2. Keep MongoDB and map credentials in `backend/.env` and `mobile/.env`, using the example files as templates.
3. Run **Terminal > Run Task > TransitLK: All** for backend (4000), browser (8082), Expo Go (8081), and admin dashboard (3001). For the Android emulator use **TransitLK: Android + Backend**.
4. Sign in using an existing account or register a passenger. Staff accounts require the appropriate role/approval. The owner dashboard opens fleet tracking; the authority dashboard opens incidents; Home connects GPS journeys, community, tickets and conductor features.

The API URL can be either `http://host:4000` or `http://host:4000/api`; clients normalize it consistently. Both account clients share and clear the same session. Email/password login is available; Google sign-in needs a real OAuth verification implementation and currently returns an explicit unavailable response.

## Validation

TypeScript and 65 backend tests pass. Mobile web and admin production builds pass. A local backend connects to the configured MongoDB database. GPS map, fleet screen, owner screen and transit service files are identical to the GPS branch; navigation adapters connect them to the other modules.

Payments and seeded tracking/dashboard figures include demonstration data. This merge does not establish a real vehicle telemetry feed or payment gateway. Mobile device UI execution still needs a final device check.
