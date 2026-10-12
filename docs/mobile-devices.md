# Running TransitLK on iPhone and Pixel 7

## Expo account requirement on iPhone

Sign in to the same Expo account on the iPhone and development server.
In VS Code run `TransitLK: Sign in to Expo for iPhone` and complete the terminal
username, hidden password and any two-factor prompts yourself. Browser auto-launch
is intentionally avoided because it can fail on Windows. Alternatively run `scripts\\run.cmd login` from the project
root. This helper uses the same project-local Expo account store as the
development server; a plain global `expo login` uses a different store.
Run `scripts\\run.cmd whoami` to confirm the username, restart the Mobile
task if the account error persists, and scan its current QR code again.
Never put an Expo password or token in source code or chat.

Run the VS Code task `TransitLK: Backend`, then `TransitLK: Mobile (Expo Go)`.
The launcher detects the current Wi-Fi address and prints the Expo Go URL.
Keep the iPhone and computer on the same Wi-Fi. Scan the Expo QR code with
the iPhone Camera and open it in Expo Go. The Pixel 7 emulator can use the
same Expo URL. `TransitLK: Android (Pixel 7)` opens the emulator automatically.

If a previous server holds the port, stop that task in VS Code before restarting.
Alternatively set `TRANSITLK_EXPO_PORT=8083` for a separate development server.
Use the address printed by the current server, not an old recently opened entry.
For a nonlocal backend, set `TRANSITLK_API_URL` explicitly.

The app icon is `mobile/assets/icon.png`; Android adaptive artwork and the
web favicon are beside it. The project-owned source renderer is
`scripts/create-brand.py` (Python and Pillow). Expo Go displays this project
icon while opening TransitLK. A separate installed home-screen app requires
a native build; changing this image does not rename or replace Expo Go itself.

Verification on 11 October 2026: Android bundle loaded on the Pixel 7 emulator;
iOS development bundle was served successfully. Physical iPhone execution
requires the owner to scan the current QR code and confirm the screen loads.
