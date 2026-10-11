# CircleHub Mobile — Parity & Backlog

The mobile app tracks the CircleHub web app feature for feature. This file records what is in
place and what is still open. Keep it current when parity work lands.

## In place

- **Auth** — register, sign in, sign out, session restore via `expo-secure-store`, automatic
  sign-out on `401`, forgot/reset password, and signed-in change password (signs out everywhere).
- **Email verification** — deep-linkable `verify-email` screen, resend, and unverified-login
  routing to the verify screen (web parity).
- **Feed & explore** — public feed, post detail, comments, likes, browse/search communities.
- **Posts** — create, edit, delete; text with an optional single image; community posts.
- **Communities** — browse, create, join/leave, and the detail screen (Posts / Members / Media /
  About tabs).
- **Manage community** (admins & moderators) — settings, members, and join requests.
- **Profile** — own profile, edit profile (avatar, cover, bio, skills, gender, birthdate), other
  profiles, followers/following, follow/unfollow, and an account Settings tab (appearance-only,
  matching the web app).
- **Theming** — light and dark; primary actions use the shared `GradientButton`.

## Open

- **Notifications** — deferred. The web page is a hardcoded stub and the backend has no
  notifications endpoint yet.
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
