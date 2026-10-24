# CircleHub Mobile — Parity & Backlog

The mobile app tracks the CircleHub web app feature for feature. This file records what is in
place and what is still open. Keep it current when parity work lands.

## In place

- **Auth** — register, sign in, sign out, session restore via `expo-secure-store`, automatic
  sign-out on `401`, forgot/reset password, and signed-in change password (signs out everywhere).
- **Email verification** — deep-linkable `verify-email` screen, resend, and unverified-login
  routing to the verify screen (web parity).
- **Feed & explore** — public feed, post detail, comments, likes, browse/search communities.
- **Posts & Comments** — create, edit, delete; text with an optional single image; community posts; full-screen
  slide-up/slide-down Create Post modal (`presentation: "transparentModal"`, `animation: "slide_from_bottom"`);
  pressable post cards that navigate to post details with full natural image height display;
  consistent themed in-app `ActionModal` and `ConfirmModal` for post and comment options/deletion (replacing native OS alerts).
- **Communities** — browse, create, join/leave, and the detail screen (Posts / Members / Media /
  About tabs).
- **Manage community** (admins & moderators) — settings, members, and join requests (including
  `?tab=requests` deep-link support from notifications).
- **Profile** — own profile, edit profile (avatar, cover, bio, skills, gender, birthdate), other
  profiles, followers/following, follow/unfollow, and an account Settings tab (appearance + E2EE
  12-word recovery phrase setup & unlock, matching the web app).
- **Messaging & Real-Time (SignalR + E2EE + Key Recovery)** — conversations list, message threads,
  New Message recipient picker modal, categorized native emoji picker with keyword search, seamless
  optimistic sending (pre-seeded decrypt cache + server ID handoff with zero flicker) and 1-click
  retry on failure, real-time message delivery (`ReceiveEncryptedMessage`), online / last-seen
  presence (`PresenceChanged`), a live typing indicator shown only above the composer (`TypingBubble`,
  case-insensitive user ID matching), connection status indicator, WebCrypto-
  interoperable `ENC:v1:` end-to-end encryption (`ECDH-P256+HKDF-SHA256+AES-256-GCM`) with multi-key
  historical keyring support, and fast 12-word BIP39 recovery phrase setup & cross-device history
  unlock (`PBKDF2-HMAC-SHA-256`, reactive live re-decryption via `useSyncExternalStore`). See
  [`docs/updates-and-fixes.md`](./docs/updates-and-fixes.md) for detailed bug root causes and fixes.
- **Notifications & Push** — in-app `/notifications` screen, live header bell unread badge,
  `NotificationCreated` real-time updates, once-per-visit seen stamp, "Mark all as read", per-row
  mark-as-read / delete, deep-linking (`CommunityJoinRequested` → Manage Community `requests` tab),
  scaled transparent monochrome CircleHub statusbar & drawer icon (`notification-icon.png`),
  fallback large icon (`largeIcon`), non-enlarging sender avatar thumbnail, multi-line message history expansion
  on hold/drag-down via `patches/expo-notifications+57.0.24.patch`,
  and Expo push token registration (`POST /api/devices`) + sign-out unregistration
  (`DELETE /api/devices`) with tap navigation.
- **Theming & App Experience** — light and dark; primary actions use the shared `GradientButton`. Presence
  indicators (online dot and "Online" label) render from the shared `--success` token in both
  themes rather than hardcoded greens. App boot renders `AppLoadingScreen` featuring the official CircleHub logo
  with a smooth pulsing animation and theme-colored activity indicator (matching webapp parity).

## Open

- **Verification email links point at the web app** — the backend sends `FrontendUrl` links.
  Deep-linking them into the app needs a backend change (Universal/App Links) and is out of scope
  here.
- **Comment editing** — not implemented; the backend exposes no update-comment endpoint.

## Verification

Before considering a change done, run:

```bash
npx tsc --noEmit
npm run lint
npm test
```
