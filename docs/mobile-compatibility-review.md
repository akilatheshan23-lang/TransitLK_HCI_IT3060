# Mobile compatibility review

Reviewed 12 October 2026 for Expo Go on iPhone and Android.

## Changes

- Native passenger and fleet maps replace static images; the fleet header uses React Native View instead of HTML div.
- Native screens use device safe areas instead of simulated status bars.
- Owner, authority and admin portal links derive their host from the configured API rather than localhost or a fixed private IP.
- The owner overview website button opens the owner website instead of staff management. Both owner role aliases return from fleet tracking to their dashboard.
- Admin web, owner web and authority web clients use the same-origin /api path. Vite proxies it to the backend so phone browsers can connect without cross-origin LAN configuration.
- Image uploads restore the shared session before sending authenticated requests.
- The conductor scanner handles camera permission failures and keeps manual ticket entry available.
- Demo vehicle positions and overview metrics are identified as demonstration content.

## Checks completed

- Mobile TypeScript check passed.
- iOS, Android and web development bundles returned HTTP 200.
- All 73 backend fixture tests passed, covering authentication, roles, payments, ticket validation, fleet lifecycle, community and transit rules.
- Admin production build passed using Vite native config loading. The default config loader could not spawn a process in this execution environment.
- The running admin portal /api/health proxy returned HTTP 200 and database connected.

## Device acceptance still needed

Bundling is not an end-to-end device test. On the phone, reload Expo Go and exercise passenger login, route selection, map controls, demo checkout, saved tickets, community image upload, owner fleet, authority incidents and conductor scanning using authorized test accounts. Camera and photo access must be granted by the user. The physical iPhone is not remotely controlled here. Native map tiles require network access; live vehicle telemetry and real payment settlement are not established by these checks.

For a deployed admin production build, configure a same-origin /api reverse proxy or set VITE_API_BASE_URL during the build. Vite's development proxy is not included in static output.
