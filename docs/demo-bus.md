# Moving demo bus

Open Plan route · My location, then tap Try demo journey · Malabe to Borella. This fills both endpoints, loads a suggested road route and starts a simulated bus. You can also select two search results and press Show route. The demo does not require GPS permission, an owner account, or a new backend endpoint.

The demo travels along the road polyline at a simulated 36 km/h. Distance determines its position and remaining ETA; it stops at the destination. Pause, Resume and Restart are available. It does not publish coordinates to the real bus feed. Passenger tracking sheets default to Demo bus and offer an explicit switch to owner-phone GPS.

The web map uses the configured Geoapify tile provider and its required attribution, replacing the OpenStreetMap volunteer endpoint that returned blocked tiles. Native maps retain their existing native provider. Internet and a working configured Geoapify key are still required for tiles and routing.

Verified in the browser: sample journey loading, visible road tiles and bus icon, decreasing ETA, Pause and Resume. The tile request returned HTTP 200 image/png. Mobile TypeScript and iOS/Android/web bundles pass; seven routing/simulation tests pass. Physical-device animation has not been directly observed.
