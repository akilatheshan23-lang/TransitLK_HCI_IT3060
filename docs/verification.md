# Verification — 1 October 2026

## Passed

- TypeScript: `tsc --noEmit` (no diagnostics).
- Expo SDK dependency check: `expo install --check` (dependencies up to date).
- 14 automated HTTP tests: registration validation, passenger-only role enforcement, normalized/unique email, salted password storage, hashed session storage, invalid/valid login, protected profile read, language update, cross-account isolation, logout revocation, expiry, malformed/oversized payloads, database health failure and authentication rate limiting.
- Production web export: 250 modules bundled; web JavaScript about 485 KB.
- Android JavaScript export: 714 modules bundled; about 1.1 MB. This was a non-bytecode compilation check, **not an APK build or a physical-device test**.
- Running Expo web app opened and visually reviewed in Chrome against the uploaded screenshot. Welcome layout, bus vector, typography, teal primary action and responsive centered surface rendered.
- `/api/home` returned HTTP 200 with supported languages and an empty notification feed.
- `/api/health` returned HTTP 503 while the real database was unavailable.
- `git check-ignore backend/.env` confirmed the supplied database URI is excluded from Git.

## Blocked or pending

- MongoDB Atlas: connection attempts to all three nodes failed with `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` (TLS alert 80). Credentials and connection strings were not printed. Check the Atlas IP allowlist, cluster state and network/TLS path; the exact cause was not established. No TLS validation was disabled. The backend retries its initial connection every 30 seconds.
- Real MongoDB account CRUD and persistence across server restarts: pending a successful connection. Automated HTTP tests use an isolated in-memory test repository.
- Physical Android/iOS testing, OS keyboard overlap, screen-reader review and font-scaling: pending.
- APK: not built. A preview APK profile is supplied in `mobile/eas.json`.
- Five-participant usability study: not performed. The template contains no fabricated results.
- Figma connector: permission denied; screenshot/PDF reference used instead. Exact Figma asset and typography fidelity cannot be claimed.

## Manual acceptance checklist

1. Open the welcome screen at phone widths 320–430; scroll on shorter displays.
2. Choose English, Tamil and Sinhala, refresh and confirm the selected language remains.
3. Open Get started; submit missing fields or mismatched passwords and read the inline error.
4. With Atlas available, create a fictional passenger; confirm it exists in the database with a hash rather than a plaintext password.
5. Sign out; sign in; refresh; confirm the session and language restore.
6. Change language while signed in; restart the server and verify the saved preference.
7. Open notifications; verify the honest empty state, then stop the API and retry to observe the recoverable error.
8. Test invalid/expired credentials and a lost connection; no successful-save state should be shown.

Record actual observations before marking additional items passed.

## Update — 2 October 2026

- Replaced the local ignored MongoDB URI with the user's new cluster.
- The new cluster is reachable but returns MongoServerError / AtlasError code 8000 with an authentication failure. Real MongoDB persistence remains unverified. Correct database-user credentials are required.
- Added VS Code task and Run/Debug choices for Backend (4000), Frontend browser (8082), Mobile Expo Go (8081), and All.
- Concurrent startup verified: backend welcome API 200, browser preview 200, iPhone Expo manifest 200, and browser CORS origin accepted.
- All 14 HTTP tests still pass. No secret was added to tracked source.

## Update — 3 October 2026

- Current local MongoDB configuration connects successfully; `/api/health` returns HTTP 200 with `database: connected`. This supersedes the earlier connection failures above.
- TypeScript and all 14 isolated HTTP tests pass.
- Android development bundle responds HTTP 200 (4,224,686 bytes).
- Added Android (Pixel 7) and Android + Backend choices to VS Code tasks and Run/Debug. Android API address is `10.0.2.2:4000`; iPhone and browser options remain available.
- Pixel_7 emulator is booted and reachable with ADB. Official Expo Go 57.0.9 downloaded from Expo's GitHub release.
- Expo Go installed successfully on Pixel_7. Welcome screen and sign-in sheet visually verified on the running Android emulator.
- Fixed Android launch binding to accept IPv4 connections; ADB forwards port 8081. Backend health remains connected. No standalone APK was built, and real-user login/account persistence was not exercised in this check.
