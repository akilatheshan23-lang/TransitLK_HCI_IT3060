# Location and route maps

Use **Plan route · My location** on passenger Home, Transit search, the bus tracking sheet, Owner dashboard or Fleet routes. Type a start and destination, choose each result, then press **Show route**. Search results are restricted to Sri Lanka. The map draws Geoapify bus-mode road geometry rather than an invented polyline. Green is the selected start, red is the destination, and blue is the phone's location.

**Use my current location** requests foreground location permission through Expo Location. Permission denial, disabled location services and missing GPS fixes show recoverable messages. Updates stop when leaving the planner or backgrounding the app. The start is a snapshot of the selected GPS fix; the blue marker continues to update. Press the location button again to update the start and recalculate the route. Coordinates are not stored in TransitLK; explicitly requested road routing sends selected waypoints to Geoapify.

Phone browser geolocation requires HTTPS. An HTTP LAN address can display maps and address results but cannot provide browser geolocation; use Expo Go on iPhone/Android for local device GPS. Custom native builds must be rebuilt after adding the expo-location permission plugin.

Passenger bus maps resolve stop names and use the ordered routeStops returned by bus search. The owner Fleet routes view requests authenticated `/api/fleet/routes`, which filters MongoDB buses by the session's owner ID. It never substitutes other owners' buses when no fleet exists. Restart the backend for this endpoint and the routeStops search response.

Map routes are suggestions through geocoded stops, not independently verified operator itineraries. Ambiguous place names should be checked in the manual planner. No invented position is displayed on the passenger route map. Bus GPS remains unavailable until an actual vehicle GPS feed is connected; the phone marker is never presented as a bus position. Existing passenger speed/ETA demonstration cards and the owner overview metrics remain labelled as demos.

Verification: 85 backend/routing tests pass, including owner access restrictions and session scoping, GeoJSON coordinate order, intermediate stop ordering, invalid geometry, and missing-route errors. TypeScript and all three Metro platform bundles were checked. Geoapify returned Malabe (6.9040723, 79.9546189), Borella (6.9148334, 79.8776), and a 9,850 m bus-mode road route. Physical iPhone/Pixel permission dialogs and GPS accuracy require on-device verification.

References: https://docs.expo.dev/versions/latest/sdk/location/ and https://apidocs.geoapify.com/docs/routing/
