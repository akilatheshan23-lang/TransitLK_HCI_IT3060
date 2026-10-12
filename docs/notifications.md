# In-app notifications

The mobile application's bell buttons open one shared inbox on iOS, Android and web. Closing the inbox preserves the underlying screen. Signed-out users are prompted to sign in.

The inbox reads authenticated account updates from `/api/notifications`. It refreshes when opened, when the app returns to the foreground and every 30 seconds while active. Tap an unread item to mark it read, or use Mark all read. Read receipts are persisted per account in MongoDB's `notificationReceipts` collection. Failed requests display an error and can be retried.

Sources include current account status, newly purchased authenticated tickets, activity on the user's community posts, the owner's fleet status, approved authority/officer incidents, and administrator approval requests. Results are limited to the latest 100 derived updates; this is a current-state inbox rather than a permanent event archive. Older tickets without a verified notification owner are not backfilled. Guest and client-supplied payment identities cannot receive another user's ticket notifications.

These are in-app notifications, not operating-system push notifications. No lock-screen alerts are sent when the app is closed. Restart the Backend task after installing this change, then reload Expo Go.

Validation: backend notification tests cover authentication, stable identifiers, read persistence, account isolation, and invalid payloads. Mobile TypeScript and iOS/Android/web bundle checks cover compilation; physical-device delivery requires checking the running app after the backend restart.
