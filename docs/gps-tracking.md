# GPS tracking management

The app now contains the supplied journey search, available rides, and tracking screens. Bus and train use distinct accessible vector icons. Google Maps renders on Android through react-native-maps; iOS uses Apple Maps. Browser previews provide a Google Maps link because the native map is mobile-only.

## Run

Start Pixel_7, then select **TransitLK: Android + Backend** in VS Code Run and Debug and press F5. Keep both servers running. Existing signed-in users land on journey search. Guests can select Explore journeys from the welcome screen.

## Demo and real data

Demo is explicitly shown in search, results and tracking. Bus: Horana ↔ Colombo, route 125. Train: Panadura ↔ Colombo. These are illustrative schedules, fares, route lines, positions, arrival estimates and crowd values, not operator information. Demo movement changes every five seconds. Use the Journey source control to switch to Live services. Live search returns only published MongoDB trips and never substitutes sample journeys.

Ticket purchases and community messaging belong to other modules and are presented as unavailable. No payment is taken. Saved journeys support create, list, rename and remove, are persisted in MongoDB, and are restricted to their owner.

## Google Maps key

Expo Go includes the native map setup, so no personal key is needed for emulator testing. For a standalone build create a Google Cloud project, enable billing and Maps SDK for Android, create an API key restricted to Android package `lk.transit.mobile` and your signing SHA-1, and restrict its API access to Maps SDK for Android. Set `GOOGLE_MAPS_ANDROID_API_KEY` in ignored `mobile/.env` or your EAS build environment. `mobile/app.config.js` passes it to the native config plugin. Rebuild after changing the key. Do not commit keys. No Google Cloud project, billing account, or production key was created by this implementation.

Official instructions: https://docs.expo.dev/versions/latest/sdk/map-view/ and https://developers.google.com/maps/documentation/android-sdk/get-api-key

## Operator integration

A trusted operator must publish trip documents in MongoDB's `trips` collection with: unique `id`, `source: "live"`, `mode` (`bus` or `train`), `route`, `from`, `to`, `date` (`YYYY-MM-DD`), `departure`, `arrival`, numeric `fare`, and `path` (array of `{latitude,longitude}`). The catalog is provisioned by an operator; passenger accounts cannot publish trips.

Set a random operator secret of at least 32 characters in backend `TRANSIT_INGEST_KEY`. A trusted feed sends `POST /api/telemetry/:id` with `x-transit-key` and JSON `{position:{latitude,longitude},updatedAt:"ISO timestamp",etaMinutes:5,crowdPercent:60}`. Estimates may be null. Coordinates and timestamps are validated; updates older than two minutes, future-dated by more than ten seconds, duplicate or out-of-order updates are rejected. Unknown trips cannot be created through telemetry. Never embed the ingestion key in the passenger app. Use HTTPS for deployment.

Passengers poll `GET /api/journeys/:id/tracking` every five seconds while the screen is active. Data older than 60 seconds is marked stale and estimates disappear. Polling pauses in the background and stops when leaving tracking. Google Maps supplies the basemap, not bus GPS, timetables, ETA or passenger counts; those must come from your operator.

## Verification

Automated tests cover demo/live separation, invalid dates, unknown routes, stale data, operator authentication, coordinate validation, out-of-order updates, and owner-scoped saved journey CRUD, alongside existing authentication tests. Real operator integration and standalone builds require your credentials and feed.
