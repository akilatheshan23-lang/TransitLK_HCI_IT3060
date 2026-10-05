# TransitLK

React Native mobile app and Node.js API for IT3060 Milestone 03, Group WE_07.

## Implemented scope

The supplied **Welcome** screen (prototype screen 01), with navy/teal styling, a scalable bus illustration, responsive layout, safe areas, accessible controls, and English/Tamil/Sinhala text. Account creation and sign-in open in bottom sheets so this remains a single main-screen implementation. An authenticated passenger can read their account, update their language, and sign out. Notifications have loading, empty, failure and retry states; no invented live service data is displayed.

The report calls screen 04 **Home** and screen 06 **Live map**. Those are distinct from the uploaded welcome image and are not implemented here. GPS tracking, ETA, tickets, payments and staff portals remain future modules. This welcome slice alone does **not** complete Assignment 3 or the allocated GPS workload.

## Requirements

- Node.js 22.13+ (Node 24 recommended)
- pnpm 11.25.0 (`npm install -g pnpm@11.25.0`)
- MongoDB Atlas cluster with valid database credentials and this computer's IP allowed
- Expo Go compatible with SDK 57 for a physical-device preview, or an Android development environment

The project uses Expo SDK 57 / React Native 0.86.3 / React 19.2.3. Exact dependencies are recorded in `pnpm-lock.yaml`.

## Setup

```sh
pnpm install
```

Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`. Use database `transitlk`. The supplied URI has been placed in the local ignored `.env` file on the original computer; it is intentionally absent from Git. Never put MongoDB credentials in `EXPO_PUBLIC_*`, screenshots or frontend code. Rotate the originally shared database password before wider use, then update the local file.

Copy `mobile/.env.example` to `mobile/.env` if an API override is needed:

- Chrome on this computer / iOS simulator: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000` (the default on Android)
- Physical phone: `http://YOUR_PC_LAN_IP:4000`, with phone and PC on the same network

For a phone, the API must be reachable on the local network; configure the PC firewall yourself if it blocks port 4000. Restart Expo after changing a public environment variable. Production builds must use an HTTPS API URL.

## Run

### VS Code + iPhone (recommended on this computer)

Open `TransitLK.code-workspace`, then press **Ctrl+Shift+B** to run the default **TransitLK: All** task. It opens Backend (4000), Frontend browser (8082), and Mobile Expo Go (8081) in separate terminals. The same choices are also available under Run and Debug (Ctrl+Shift+D), with an All compound. Stop old instances first if these ports are occupied. Use **Terminal → Terminate Task** to stop these tasks.

Connect the iPhone and PC to the same Wi-Fi. Install/open an Expo Go version compatible with SDK 57. Scan the Expo terminal QR code using the iPhone Camera, then tap **Open in Expo Go**. The frontend launcher detects the computer's Wi-Fi IP and injects that address as the API URL; `localhost` on an iPhone refers to the phone itself.

For only the backend and iPhone app, in two VS Code terminals at the repository root:

```powershell
.\scripts\run.cmd backend
```

```powershell
.\scripts\run.cmd mobile
```

If the wrong adapter is selected, set `$env:TRANSITLK_HOST_IP='YOUR_PC_WIFI_IP'` in the frontend terminal before running the command. The launcher uses installed Node or the existing bundled Codex runtime. It does not require a global pnpm installation after dependencies are installed.

Check `http://YOUR_PC_WIFI_IP:4000/api/home` in iPhone Safari if the app cannot reach the API. A JSON response verifies phone-to-PC reachability. `/api/health` separately verifies MongoDB and can return 503 even when the phone connection is working. No firewall or Atlas network settings are changed by these launchers.

### Standard pnpm commands

```sh
# Terminal 1
pnpm api
# Terminal 2: Expo QR code for a physical phone
pnpm mobile
# Or browser preview
pnpm web
```

Open http://localhost:8081 for the browser preview. Open the repository folder in VS Code or Antigravity. `start-local.ps1` can launch the two services on Windows; it also detects the bundled Codex Node/pnpm runtime on the original machine when Node is not on PATH.

The API starts even when Atlas is unavailable and retries its initial database connection every 30 seconds. `/api/health` returns 503 until a real connection exists. Account operations return a recoverable 503, never pretend to save locally. `/api/home` remains available because the welcome metadata is static.

## Verify

```sh
pnpm typecheck
pnpm test
pnpm --filter @transitlk/mobile export
```

Tests use an isolated in-memory repository to exercise real HTTP handlers. They do not claim to verify Atlas persistence. On process-restricted environments, run `node --test --experimental-test-isolation=none backend/test/api.test.js` from the repository root. See `docs/verification.md` for observed results and `docs/assignment-3.md` for requirement traceability and pending evidence.

## Android APK

An APK is not included. After configuring an Expo account and a reachable HTTPS API, run from `mobile`:

```sh
npx eas-cli build --platform android --profile preview
```

This invokes the external Expo build service and can require account setup or build credits. The checked-in `eas.json` requests an installable preview APK.

## API contract

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Real database health; 503 if unavailable |
| GET | `/api/home` | Supported languages and empty notification feed |
| POST | `/api/auth/register` | `{name,email,password,language}` → token + passenger profile |
| POST | `/api/auth/login` | `{email,password}` → token + profile |
| GET | `/api/me` | Read the current passenger profile |
| PATCH | `/api/me/preferences` | `{language: "en" | "ta" | "si"}` → updated profile |
| POST | `/api/auth/logout` | Revoke the current session; 204 |

Protected endpoints require `Authorization: Bearer <token>`. Passwords use salted scrypt; session tokens use cryptographic randomness and are stored hashed on the server, with seven-day expiry. Native devices store credentials in OS-backed SecureStore. Browser preview uses tab-scoped sessionStorage and is not the production web authentication architecture. Registration always creates a passenger: clients cannot select privileged roles. Authentication is rate-limited, request payloads are validated, and database errors are redacted.

There is no email verification or password-reset provider in this slice. Add these, production monitoring, server HTTPS and a security review before deploying public authentication.

## Structure

```text
mobile/               Expo React Native app
  App.tsx              Welcome screen and supporting sheets
  src/Artwork.tsx      Bus illustration and icons
  src/api.ts           API client and secure native session storage
  src/i18n.ts          Three-language copy
  src/theme.ts         Shared design colors
backend/
  src/app.js           Validated REST endpoints
  src/auth.js          Password and token helpers
  src/store.js         MongoDB persistence and indexes
  src/server.js        Server lifecycle and connection recovery
  test/api.test.js     HTTP behavior and authorization tests
docs/                  Assignment notes and verification evidence
```

## Design provenance

Based on the user-supplied screenshot and the supplied Milestone 02 PDF. The Figma connector could not read the node because the connected account lacked edit access. The bus is a hand-coded vector reconstruction, not an exported Figma asset. No screenshot is embedded as UI. Device frame, camera cutout, status clock and home indicator are left to the OS. Sinhala is an added language option consistent with FR05. Account forms are sheets rather than separate screens, a deliberate adaptation to the requested home-only scope. Native Tamil/Sinhala readers should review the translations before usability testing.

## All-in-one VS Code controls

Open Run and Debug (Ctrl+Shift+D) and choose Backend, Frontend (browser), Mobile (Expo Go), or All, then press F5. Alternatively, Ctrl+Shift+B runs All as tasks. Use one method at a time to avoid duplicate servers. Frontend and Mobile are two targets of the same React Native source, not duplicated apps. For browser only, use `scripts\run.cmd frontend`; for Expo Go use `scripts\run.cmd mobile`.

On this computer the debugger uses the existing bundled Node runtime. On another machine with Node installed, remove the Windows runtimeExecutable override from `.vscode/launch.json` or replace it with your Node path.

The MongoDB URI was updated on 2 October 2026. The new cluster is reachable but returned Atlas error 8000 with an authentication failure. Correct the Atlas database-user username/password in the private `backend/.env`, then restart Backend. Do not use an Atlas website-login password in place of the database-user password.

### Android Studio / Pixel 7

Start Pixel_7 from Android Studio Device Manager. In VS Code open Run and Debug (Ctrl+Shift+D), select **TransitLK: Android + Backend**, and press F5. Expo will open the app in Expo Go on the running emulator. The Android app uses `http://10.0.2.2:4000` to reach the backend on this PC. Keep both terminals running.

The existing Frontend (browser) and Mobile (Expo Go) options remain available. Stop the current mobile server before switching between Android and iPhone, because both use port 8081. MongoDB credentials belong only in ignored `backend/.env`.
