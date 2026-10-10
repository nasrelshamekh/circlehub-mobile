# Mobile Auth Task List (verified-email sign-in gating)

Build this yourself — I'm hands-off. Tick boxes as you go. Ask me when stuck.

Reference reading:
- Expo Router Authentication guide: https://docs.expo.dev/router/advanced/authentication/
- Protected routes: https://docs.expo.dev/router/advanced/protected/
- expo-secure-store (SDK 57): https://docs.expo.dev/versions/v57.0.0/sdk/securestore/ (works in Expo Go; `getItemAsync` / `setItemAsync` / `deleteItemAsync`)

## Backend context (already done — not your work)

- [x] Register no longer mints a JWT (returns `ApiResponse<UserDto>` + "check your inbox" message).
- [x] Login returns `403` "Email not verified" for unverified users.
- [x] `/api/Auth/me` exists (returns `User`). Requires Bearer token.
- [x] Feed is public: `GET /Posts` only returns posts visible to the requester (`WhereVisibleTo`): anonymous sees standalone (non-community) posts only; signed-in also sees public-community + joined/admin community posts.
- [ ] (deployment) Commit + push the backend register fix. Nudge me to do this.

## Phase A — Token storage

- [x] Run `npx expo install expo-secure-store` (confirm it appears in `package.json`). — already present in `package.json` + registered as an `app.json` plugin.

## Phase B — Session + API layer

- [x] Create `src/lib/session.ts` (getToken / setToken / clearToken over a single key, e.g. `auth_token`). — added a web `localStorage` fallback since SecureStore is native-only.
- [x] `src/api/client.ts`: attach `Authorization: Bearer <token>` to every request; parse `message` from error JSON bodies; on `401` clear token and throw an error carrying `status` + message. — also falls back to the first ASP.NET validation error when `message` is absent.
- [x] `src/api/auth.ts`: add `register()`, `verifyEmail(userId, token)`, `resendVerification(email)`, `me()` (mirror existing `login()` style).
- [x] Note: `register()` returns NO token — do not type it as an `AuthResponse`. — typed as `{ message, data: User }`.

## Phase C — Auth state

- [x] Create `src/context/authcontext.tsx` (mirror `themecontext.tsx` pattern):
  - `status: "loading" | "authenticated" | "unauthenticated"`
  - `user: User | null`
  - `signIn()`, `signUp()`, `signOut()`
  - On mount: restore token from SecureStore → call `me()` → authenticated; on error clear token.
- [x] Mount `<AuthProvider>` in `src/app/_layout.tsx`. Split into wrapper + inner component (inner consumes `useAuth`). While `loading`, render splash view (no Stack) to avoid screen flash.
- [ ] `(auth)/_layout.tsx`: optional; skip unless you want distinct styling.

## Phase D — Screens

- [x] `src/app/(auth)/login.tsx`: replace stub. Fields: usernameOrEmail + password. On 403 show "verify your email" + Resend button; on 401 invalid credentials; success → `router.replace("/(tabs)")`. — Resend only offered when an email is known (typed or handed over from register).
- [x] `src/app/(auth)/register.tsx`: replace stub. Fields (all required, match backend RegisterDto):
  `name`, `username`, `jobTitle`, `gender`, `dateOfBirth`, `location` (`City, Country`), `email`, `password` (min 8).
  Success → show "check your inbox" message + resend button. Do NOT send to tabs (unverified).

## Phase E — Route guards

- [x] `_layout.tsx` root Stack: wrap `(tabs)` in `<Stack.Protected guard={status === "authenticated"}>`.
  - Do NOT use `redirectTo` (SDK 58+ only). Unauthenticated users hitting tabs get bounced to landing.
- [x] `src/app/index.tsx` landing: if authenticated → `<Redirect href="/(tabs)" />`.
- [x] `landinghero.tsx` (guest CTA ~line 171): change `router.push("/(tabs)")` → `/(auth)/login`.
- [x] `header.tsx` "Sign Out" (~line 143): call `signOut()` (guard handles navigation).

## Phase F — Verification

- [x] `npx tsc --noEmit` passes.
- [x] `npx expo lint` passes.
- [ ] Manual flow (emulator/phone): — on-device UI still needs a device, but the **API-level equivalent was driven end to end on 2026-10-10 and passed** (register→201 no token; unverified login→403; resend→200; mark verified in DB; login→200+token; `/api/Auth/me`→200; garbage token→401). Note the `src/app/(auth)/register.tsx` Gender control was rebuilt as a working modal picker (the old field was a disabled input) and the success screen now has its own Resend button.
  1. Register new user → no feed access.
  2. Mark verified in DB (`UPDATE users SET EmailVerified = 1 WHERE Email = '<email>';`) or click the email link.
  3. Login → lands on `/(tabs)`, feed loads (auth header sent).
  4. Log out → auto-redirected to landing.
  5. Invalidate token → next request 401 → bounced to login.

## Suggested build order

B -> C -> E1 -> D -> E2/E3