# CircleHub Mobile & Web — Updates, Bug Reports, and Fixes Log

This document records the post-implementation bugs discovered during real-device/emulator testing across `circlehub-mobile` (Expo / React Native) and `CircleHub` (React / Vite web), their root causes, and the implemented fixes.

---

## 1. Cross-Device E2EE Historical Key Vault (`KeyBackupBundleV1.keys`)

### Symptom
When a user generated a 12-word recovery phrase on the web app and then unlocked it on mobile (or vice versa), messages sent *before* the recovery phrase was generated still displayed `[Can't decrypt this message]`.

### Root Cause
1. `createRecoverableDeviceKey()` previously generated a brand-new P-256 keypair and replaced the active device key when setting up recovery, or only backed up a single active device key (`deviceId` + `deviceKeyPkcs8`) rather than the user's full historical keyring.
2. When unlocking on a second device (`importDeviceKey`), the new device overwrote its own local key without preserving additional historical keys in a multi-key ring.

### Fix
- **Files:**
  - Mobile: `src/services/messageCrypto.ts`, `src/services/keyRecovery.ts`
  - Web: `src/services/messageCrypto.js`, `src/services/keyRecovery.js`
- **Changes:**
  - Stored `pkcs8B64` alongside newly generated keys in `createAndStoreKey` and reused the existing device key in `createRecoverableDeviceKey` so generating a backup phrase never orphans pre-existing messages.
  - Added multi-key ring storage (`device-keys:<userId>`) and `importAdditionalDeviceKeys` so all historical device keys are retained across imports and unlocks.
  - Extended `KeyBackupBundleV1` with `keys?: Array<{ deviceId: string; pkcs8B64: string }>` so every known device key is included in the encrypted backup and restored on unlock.
  - Updated `decryptIfNeeded` to iterate through all stored keys matching any wrap entry in `envelope.w`.

---

## 2. Mobile Fast Recovery Phrase Unlock & Live Message Re-Decryption

### Symptom
1. Unlocking or setting up a 12-word recovery phrase on mobile took 15–30+ seconds before showing success.
2. After the unlock succeeded, navigating back to Messages still showed `[Can't decrypt this message]` until the app was completely restarted.

### Root Cause
1. **Slow async PBKDF2 loop on Hermes:** `@noble/hashes/pbkdf2.js`'s `pbkdf2Async` checked `Date.now()` on every single iteration (310,000 times) and yielded via `setTimeout` over 300 times on the React Native event loop.
2. **Stale failure cache & non-reactive hook:** `src/services/messageCrypto.ts` cached `UNREADABLE_PLACEHOLDER` (`[Can't decrypt this message]`) in `settledCache` when a message was first viewed before unlocking. Furthermore, `useDecryptedContent.ts` only depended on `[raw]` in its `useEffect`, so calling `invalidateDecryptCache()` cleared the `Map` without triggering a re-render of mounted message components.

### Fix
- **Files:** `src/services/keyRecovery.ts`, `src/services/messageCrypto.ts`, `src/hooks/useDecryptedContent.ts`
- **Changes:**
  - Replaced `pbkdf2Async` with a single 30ms UI yield (`yieldToUi()`) so the button loading spinner renders immediately, followed by synchronous tight-loop `pbkdf2(sha256, ...)` execution.
  - Lowered `KDF_ITERATIONS` for new mobile backups to `100_000` (matching the server validation minimum in `KeyBackupController.cs`) while still honoring `backup.kdfIterations` (e.g., `310,000`) when unlocking existing backups.
  - Stopped caching `UNREADABLE_PLACEHOLDER` in `settledCache` (only valid plaintext decryptions are cached).
  - Added `cacheVersion`, `subscribeDecryptCache`, and `getDecryptCacheVersion` in `src/services/messageCrypto.ts` and connected `src/hooks/useDecryptedContent.ts` via `useSyncExternalStore` so unlocking or importing keys immediately re-decrypts all mounted messages and conversation previews.

---

## 3. Web App IndexedDB Focus / Minimize Decryption Loss

### Symptom
On the web app (`CircleHub`), minimizing the browser window or switching focus to another window and returning caused messages to turn into `[Can't decrypt this message]` until the page was refreshed.

### Root Cause
In `C:\Projects\CircleHub\src\services\messageCrypto.js`:
1. `openStore()` began with `if (memoryFallback) return Promise.resolve(null);`.
2. `saveStoredKey()` unconditionally executed `if (!memoryFallback) memoryFallback = [];`. Because `[]` is truthy in JavaScript, any call to `saveStoredKey()` (or any 3-second IndexedDB open timeout while the tab was background-throttled) permanently set `memoryFallback` to a truthy array and disabled IndexedDB reads for the rest of the session.
3. For users who had pre-existing keys in IndexedDB (logged in before E2EE or after key merges), subsequent decryptions after returning to the tab only saw `memoryFallback` (which lacked the IndexedDB keys) and failed with `[Can't decrypt this message]`.

### Fix
- **Files:** `C:\Projects\CircleHub\src\services\messageCrypto.js`, `C:\Projects\CircleHub\src\hooks\useDecryptedContent.jsx`
- **Changes:**
  - Removed the `if (memoryFallback) return Promise.resolve(null);` short-circuit so `openStore()` always queries IndexedDB when available.
  - Replaced `memoryFallback` with a `memoryKeys` `Map` that caches merged keys read from IndexedDB (`saveMemoryKeys`) so even if a backgrounded tab temporarily times out on IndexedDB, all previously loaded historical keys remain available in memory.
  - Stopped caching `UNREADABLE_PLACEHOLDER` in `settledCache` and wired `useSyncExternalStore` (`subscribeDecryptCache` / `getDecryptCacheVersion`) into `useDecryptedContent.jsx`.

---

## 4. Mobile Typing Indicator Bubble & Categorized Emoji Picker

### Symptom / Request
Add a visible typing indicator inside the mobile conversation thread when the other user is typing, and add an emoji picker to the mobile message composer.

### Root Cause & Implementation
- **Files:**
  - `src/components/messages/emojipicker.tsx` (new)
  - `src/components/messages/messagethread.tsx`
  - `src/app/(tabs)/messages/[id].tsx`
  - `src/context/chatconnectioncontext.tsx`
  - `src/hooks/useTypingIndicator.ts`
- **Changes:**
  - Normalized `userId` to `.toLowerCase()` in `ChatConnectionContext` and `useTypingIndicator` so SignalR GUID casing differences never prevent typing indicator lookups from matching, and made `isTypingNow` pure for React Compiler (`reactCompiler: true`).
  - Added an animated 3-dot `TypingBubble` rendered via `ListHeaderComponent` at the bottom of the inverted `FlatList` in `MessageThread` whenever `isPartnerTyping` is true. This is the *only* typing indicator: the thread header and conversation list no longer render one, so the indicator appears solely above the composer.
  - Created `EmojiPicker` (`src/components/messages/emojipicker.tsx`) with 4 categories (`Smileys & Emotion`, `Hands & Gestures`, `Hearts & Symbols`, `Animals & Food`) and keyword search, toggled by a `Smile` button in the message composer bar.

---

## 5. Mobile Optimistic Message Send Handoff (Zero Flicker)

### Symptom
When sending a message on the mobile app, the optimistic message bubble appeared, disappeared briefly once the send request finished, and then reappeared when the conversation query finished refetching.

### Root Cause
1. In `src/app/(tabs)/messages/[id].tsx`, `onSettled` removed the optimistic message from `pendingMessages` immediately when `POST /api/messages` resolved, *before* the asynchronous `queryKeys.conversations()` invalidation/refetch brought the new message into `messages`.
2. When the refetched `ENC:v1:` message arrived, `useDecryptedContent` had to decrypt the ciphertext asynchronously because `settledCache` was not pre-seeded during encryption.

### Fix
- **Files:** `src/api/messages.ts`, `src/services/messageCrypto.ts`, `src/components/messages/messagethread.tsx`, `src/app/(tabs)/messages/[id].tsx`
- **Changes:**
  - Updated `sendMessage` in `src/api/messages.ts` to type and return `SendMessageResponse` (`{ conversationId, message }`).
  - Pre-seeded `settledCache.set(ciphertext, plaintext)` in `encryptForRecipients` (`src/services/messageCrypto.ts`) so the sender's own encrypted messages resolve synchronously on first render.
  - Updated `MessageThread` (`src/components/messages/messagethread.tsx`) so that on `sendMessage.mutateAsync` resolution, the optimistic entry updates its `id` to `response.data.message.id` (`pending: false`) and stays in `pendingMessages` until `messages` from the query cache contains that `id`.

---

## 6. Mobile `MessageRecoveryCard` Header Badge Overlap

### Symptom
In the mobile Settings tab (`src/components/profile/messagerecoverycard.tsx`), the title `"Encrypted Message Recovery"` overlapped with the `"Backup active"` status pill.

### Fix
- **File:** `src/components/profile/messagerecoverycard.tsx`
- **Changes:** Added `flex-1` to the left header row and split `"Encrypted Message\nRecovery"` across two lines so the title and `"Backup active"` badge never collide.

---

## 7. Mobile Expo Go Launch Icon Square Background

### Symptom
While launching CircleHub in Expo Go, a white square was visible inside the rounded gray app icon placeholder behind the CircleHub logo.

### Root Cause
1. `assets/images/circlehub-icon.png` was an 800×800 PNG with transparent outer corners and an opaque white interior square, and Android's adaptive icon background was set to `#E6F4FE`.
2. Expo Go caches app icons by their relative asset URL in the manifest (`"icon": "./assets/images/circlehub-icon.png"`), so overwriting the same filename still served the cached image in Expo Go.

### Fix
- **Files:** `assets/images/circlehub-app-icon.png` (new), `app.json`
- **Changes:** Generated a 1024×1024 full-bleed opaque `#FFFFFF` icon at `./assets/images/circlehub-app-icon.png` and updated `icon` and `android.adaptiveIcon.foregroundImage` (with `backgroundColor: "#FFFFFF"`) in `app.json` to bust Expo Go's icon cache.

---

## 8. Mobile Create Post Slide Modal Alignment & Smooth Exit Animation

### Symptom
1. The Create Post screen (`src/app/compose.tsx`) opened as a `formSheet` with a top grabber bar, `bg-surface-low`, and a `"Cancel"` text link, instead of matching the full-screen slide modal used for Send Post (`src/components/messages/sharepostmodal.tsx`).
2. Switching `compose` in `src/app/_layout.tsx` to `presentation: "fullScreenModal"` caused the close animation to skip/snap abruptly on Android.

### Root Cause
In `react-native-screens` on Android (`ScreenStack.kt` / `Screen.kt`), non-translucent presentations (`fullScreenModal`, `modal`, `push`) return `isTranslucent() == false`, which detaches the underlying `(tabs)` fragment when `compose` opens. When `router.back()` is called, `ScreenStack.kt` re-adds `(tabs)` on top of `compose` on frame 1 of the pop transaction, immediately covering `compose` before `rns_slide_out_to_bottom` can visually play.

### Fix
- **Files:** `src/app/_layout.tsx`, `src/app/compose.tsx`
- **Changes:**
  - Configured `compose` in `src/app/_layout.tsx` with `presentation: "transparentModal"` and `animation: "slide_from_bottom"`. Because `transparentModal` returns `isTranslucent() == true`, `ScreenStack.kt` keeps `(tabs)` mounted underneath `compose`, allowing `compose` to smoothly slide up from the bottom on open and slide all the way down to the bottom on close.
  - Updated `src/app/compose.tsx` to use `bg-background` and the circular `X` close button (`h-9 w-9 items-center justify-center rounded-full bg-surface-lowest`), matching `SharePostModal`.

---

## 9. E2EE Decryption Fast Path, Pre-Decryption & Server-Side Key Pruning + Wrap Cap (`#1`–`#4`)

### Symptom
Every reinstall or cleared browser profile minted a new `deviceId` in `UserDeviceKeys`, causing the key directory and message wrap list (`envelope.w`) to grow without bound. On mobile (Hermes JS), opening an envelope against multiple historical keys multiplied ECDH derivations across every wrap ($O(\text{keys} \times \text{wraps})$), causing visible UI lag and flashing empty bubbles while decrypting.

### Fix
- **Files:**
  - Backend: `Entities/UserDeviceKey.cs`, `Dtos/DeviceKeyDtos.cs`, `Data/AppDbContext.cs`, `Controllers/KeysController.cs`, `Migrations/20261021104523_AddUserDeviceKeyLastSeenAt.cs`
  - Web: `src/services/messageCrypto.js`, `src/context/ChatConnectionContext.jsx`
  - Mobile: `src/api/keys.ts`, `src/services/messageCrypto.ts`, `src/context/chatconnectioncontext.tsx`, `src/hooks/useDecryptedContent.ts`, `src/components/messages/messagethread.tsx`, `src/components/messages/conversationlist.tsx`
  - Tests: `__tests__/lib/messageCryptoDecrypt.test.ts`, `__tests__/lib/messageCryptoWrapTargets.test.ts`
- **Changes:**
  1. **Device-ID Fast Path & Memoized ECDH (`#1`):** `decryptEnvelope` now caches `deriveWrapKey` per local private key (`wrapKeyFor`) so each local key performs at most one ECDH per message, and checks wraps matching a local `deviceId` before falling back to the full AEAD sweep.
  2. **SignalR Pre-Decryption (`#2`):** `ChatConnectionContext` calls `decryptMessageContent(message.encryptedPayload)` immediately on `ReceiveEncryptedMessage` while the conversation query refetch is still in flight, so the message bubble mounts with its plaintext already in `settledCache`.
  3. **Pending Decrypt Skeleton (`#3`):** `useDecryptedContent` on mobile returns `{ text, isPending }`, allowing `MessageThread` and `ConversationList` to render a skeleton placeholder while async decryption is in progress.
  4. **Server-Side Key Pruning + Client Wrap Cap (`#4`):**
     - Added `UserDeviceKey.LastSeenAt` (`datetime(6)`, indexed on `(UserId, LastSeenAt)`), updated on `POST /api/keys` (`ON DUPLICATE KEY UPDATE`) while keeping `CreatedAt` immutable.
     - Added `PruneStaleKeysAsync` in `KeysController` (called on both `GET /api/keys/{username}` and `POST /api/keys`) to delete keys unseen for more than 30 days (`DeviceKeyLifetime = TimeSpan.FromDays(30)`), and ordered `GET /api/keys/{username}` by `LastSeenAt DESC, CreatedAt DESC` with `.Take(8)` (`MaxDeviceKeysPerUser = 8`).
     - Added `selectWrapTargets(ownKeys, recipientKeys, currentDeviceId)` on both web and mobile to cap wraps at `MAX_WRAPS = 8` (`MAX_OWN_WRAPS = 2`, always placing `currentDeviceId` first, then sorting by `lastSeenAt ?? createdAt` descending).
     - Added `isLivenessStale` (24-hour refresh threshold) inside `ensureDeviceKey` on both web and mobile so active devices periodically refresh their `LastSeenAt` stamp and are never pruned after 30 days.


---

## 9. Mobile New-Device Recovery Unlock Prompt (Web `DeviceKeyPublisher` Parity)

### Symptom / Request
The web app prompts on sign-in when a 12-word recovery backup already exists on the server ("Message Recovery Available" → **Unlock** / **Later**), so a fresh browser can unlock its message history with the phrase. Mobile had no equivalent: a user who installed the app (or wiped the phone) on a device that never restored simply saw `[Can't decrypt this message]` with no pointer to the fix.

### Root Cause
The prompt only ever existed in the web client (`CircleHub/src/components/messages/DeviceKeyPublisher.jsx`, mounted in `main.jsx`). The mobile session-start path (`src/context/chatconnectioncontext.tsx`) only called `ensureDeviceKey()` — it never checked the server backup, and the app had no persisted prompt state at all.

### Fix
- **Files:**
  - `src/services/recoveryPrompt.ts` (new)
  - `src/context/chatconnectioncontext.tsx`
  - `src/components/profile/messagerecoverycard.tsx`
  - Web: `src/components/messages/RecoverySetupDialog.jsx`, `AGENTS.md`, `docs/steps-plan.md`
- **Changes:**
  - Added `recoveryPrompt.ts` with the two prompt flags mirrored from web's `localStorage` under the same names in `expo-secure-store`: `circlehub-recovery-prompt-dismissed` (written on "Later" and on a successful setup on that device) and `circlehub-recovery-restored` (written on a successful restore); both cleared when the backup is removed so a backup created later elsewhere can prompt again. Every helper is a no-op on web (expo-secure-store has no web build; the React web client runs its own prompt).
  - Extended the session-start effect: after `ensureDeviceKey()` resolves, if no flag settles the prompt and `getBackupInfo()` finds a backup, an in-app modal offers **Unlock** → `router.push` to `/edit-profile` with `recoveryUnlock: "1"` **and** `tab: "settings"` (MessageRecoveryCard only mounts on the settings tab and edit-profile defaults to the profile tab — without the tab param the phrase dialog never opened) and **Later** → dismissed flag. Any failure of the background check stays silent so it can never disrupt the signed-in session.
  - The prompt is an in-app `Modal` rather than a native `Alert.alert`, matching the recovery card's phrase dialogs: `ChatConnectionProvider` renders outside `RootNavigator`'s themed `<View style={theme}>` wrapper, so the modal carries the theme vars itself (`style={theme}`) and a neutral `bg-black/50` scrim. Without the vars every `var(--surface-…)` resolves to nothing and the card paints transparent over the scrim.
  - `MessageRecoveryCard` derives the restore modal's visibility from the `recoveryUnlock` route param (`visible={restoreModalOpen || restoreFromPrompt}`) instead of a `setState`-in-effect, and `closeRestoreModal()` clears the param, the input and the error in one place. Flag writes sit on all three settle points: restore success, setup success, backup removal.
  - Web: `RecoverySetupDialog` now writes `circlehub-recovery-prompt-dismissed` after `initializeRecovery()` succeeds (the browser that created the backup already reads its own history — it was being prompted to unlock itself on the next sign-in), and the stale AGENTS.md/steps-plan.md claims (a per-user `sessionStorage` `circlehub-recovery-prompted:<id>` key and a `deviceId` comparison the code never had) were rewritten to describe the actual flag behavior.

---

## 10. Mobile Blue-Cast Backdrop Behind Recovery Dialogs

### Symptom
Destructive and blocking recovery dialogs ("Turn off key backup?", and the new-device unlock prompt) dimmed the screen through the platform's own modal, and the system dim composited over this app's blue-tinted light surfaces — so the backdrop behind the white card read as light blue rather than neutral, clashing with the phrase dialogs it sat beside.

### Root Cause
Both dialogs went through React Native's `Alert.alert`, whose scrim and chrome are drawn by the OS and cannot be restyled. Over a page whose light palette is violet/blue-toned (`--surface-lowest` `#ffffff` on a `#faf8ff`/`#f2f3ff` field), that composite picks up the tint.

### Fix
- **Files:**
  - `src/components/profile/messagerecoverycard.tsx`
  - `src/context/chatconnectioncontext.tsx`
- **Changes:**
  - Replaced the "Turn off key backup?" `Alert.alert` confirm with an in-app transparent `Modal` (`bg-black/50` scrim over the page), matching the setup and restore phrase dialogs already in that card. A neutral black scrim over the page reads the same regardless of the palette's tint.
  - The new-device recovery unlock prompt was converted the same way, so both recovery dialogs share one visual family instead of one being OS-chromed.
  - **Note:** `ChatConnectionProvider` renders *outside* `RootNavigator`'s `<View style={theme}>` wrapper, where the NativeWind `vars()` that define every `--surface-…` are in scope. The prompt modal therefore applies `style={theme}` to its own root; without it the card and buttons paint transparent and only the scrim and text are visible.


---

## 11. Mobile Notifications Feed Rendering & Parity with Web App

### Symptom
1. The notification card on the mobile app did not render any notifications and showed the "You're all caught up" empty state, even though the notification bell and unread badge correctly displayed "1 unread".
2. There was no "Mark all as read" button, no per-row mark as read (`Check`) button, and no per-row delete (`Trash2`) button like on the web app.

### Root Cause
1. **DTO Property Mismatch:** `useNotifications.ts` read `page.data?.notifications ?? []`, whereas backend `NotificationsController.cs` returns `ApiResponse<NotificationFeedDto>` with `Data.Items` (`page.data.items`). Because `page.data?.notifications` was `undefined`, `notifications` always evaluated to `[]` and displayed the empty state.
2. **Premature Seen Invalidation:** On screen focus, `useFocusEffect` evaluated `notifications.length >= 0` as immediately true (even while `isLoading` was true) and executed `markSeen.mutate()`. `useMarkNotificationsSeen` called `invalidateQueries({ queryKey: queryKeys.notifications() })` on success. Because `POST /api/Notifications/seen` sets `user.NotificationsSeenAt = DateTime.UtcNow`, the subsequent server refetch derived `Unread = false` for every existing row, clearing `visitUnreadCount` and hiding all unread actions.
3. **Card Structure & Controls Gap:** The mobile screen lacked the web app's card header ("Recent Activity", "Updates for @username", and the "Mark all as read" button), unread blue dots, and per-row optimistic action buttons.

### Fix
- **Files:**
  - `src/types/notification.ts`
  - `src/hooks/useNotifications.ts`
  - `src/app/(tabs)/notifications.tsx`
  - `__tests__/hooks/useNotifications.test.tsx` (new)
- **Changes:**
  - Updated `NotificationsFeedData` and `NotificationsPageMeta` types to support `items?: NotificationItem[]`, `total?: number`, and `hasNext?: boolean`.
  - Updated `useNotifications.ts` to extract items from `page?.data?.items ?? page?.data?.notifications ?? []` with optional chaining.
  - Separated visit seen stamping from explicit mark-all-read:
    - `useMarkNotificationsSeen()` calls `/api/Notifications/seen` and updates the query cache `unreadCount: 0` via `setQueryData` so the top header bell badge clears without clobbering row `unread` flags for the visit.
    - `useMarkAllNotificationsRead()` optimistically marks all rows across all pages as `unread: false` and `unreadCount: 0` before invalidating queries with the server.
    - `useMarkNotificationRead(id)` and `useDeleteNotification(id)` optimistically flip `unread: false` and remove rows immediately with automatic rollback on error.
  - Restructured `src/app/(tabs)/notifications.tsx` to match the web app:
    - Screen header with Back button, "Notifications", descriptive subtitle, and `{visitUnreadCount} unread` badge pill.
    - Notification Card with header displaying "Recent Activity", "Updates for @username", and the "Mark all as read" button when `visitUnreadCount > 0`.
    - Each notification row renders the user's avatar + type badge, actor name, action sentence, unread blue dot (when `notification.unread`), relative timestamp, per-row mark as read button (`Check`), and per-row delete button (`Trash2`).
  - Added full test suite in `__tests__/hooks/useNotifications.test.tsx` verifying data extraction, optimistic read marking, optimistic deletion, and optimistic mark all read.


---

## 12. Android System Status Bar & Bottom OS Navigation Bar Theming

### Symptom
On the Android emulator (and physical Android devices):
1. In light mode, the top status bar rendered as a solid black bar, and the status bar icons (clock, battery, Wi-Fi, notifications) did not show up.
2. The bottom Android OS system navigation bar (back, home, recents) did not match the app's theme, staying black with light buttons in light mode.

### Root Cause
1. **Unstyled Status Bar Background:** `expo-status-bar` only toggles `barStyle` (`'dark-content'` in light mode, `'light-content'` in dark mode) without passing `backgroundColor` or `translucent` to the native Android window. On Android, the system status bar defaults to an opaque black background (`#000000`). In light mode, setting `barStyle="dark-content"` painted dark gray/black icons on top of the black status bar, making them completely invisible.
2. **Unmanaged Android OS Navigation Bar:** The bottom Android system navigation bar was unmanaged and lacked runtime style bindings or contrast exemptions, causing Android to draw a default black navigation bar with white buttons regardless of the active app theme.

### Fix
- **Files:**
  - `package.json`
  - `app.json`
  - `src/app/_layout.tsx`
  - `test/jest-setup.ts`
- **Changes:**
  - Installed `expo-navigation-bar` and configured the plugin in `app.json` with `{ "enforceContrast": false }` to prevent Android 10+ from applying a forced semi-transparent gray/black contrast scrim over the bottom navigation bar.
  - Configured native Android defaults in `app.json`:
    - `androidStatusBar`: `{ "barStyle": "dark-content", "backgroundColor": "#00000000", "translucent": true }`
    - `androidNavigationBar`: `{ "visible": "always", "barStyle": "dark-content" }`
  - In `src/app/_layout.tsx`:
    - Switched from `expo-status-bar` to React Native's `<StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />`.
    - Added `<NavigationBar style={isDark ? "light" : "dark"} />` from `expo-navigation-bar`.
    - Synchronized both bars imperatively on Android inside the theme `useEffect`:
      - `StatusBar.setTranslucent(true)`
      - `StatusBar.setBackgroundColor("transparent")`
      - `StatusBar.setBarStyle(isDark ? "light-content" : "dark-content")`
      - `NavigationBar.setStyle(isDark ? "light" : "dark")`
      - `SystemUI.setBackgroundColorAsync(stackBackground)`
  - Mocked `expo-navigation-bar` in `test/jest-setup.ts` to keep Jest test runs fast and isolated.


---

## 13. Dynamic App Naming (`circlehub-mobile` in Expo Go vs `CircleHub` in EAS Builds)

### Requirement
Keep the Expo project name and URL slug as `circlehub-mobile` (for Expo Go and local development), while setting the app display name on the device home screen and launcher to `CircleHub` when built via EAS (e.g., development client build, preview, or production).

### Implementation
- **Files:**
  - `app.config.js` (new)
  - `eas.json`
- **Changes:**
  - Added dynamic config in `app.config.js` that checks `process.env.APP_NAME` or `process.env.EAS_BUILD === "true"`:
    - In Expo Go / local dev server: evaluates to `circlehub-mobile`.
    - In EAS Build: evaluates to `CircleHub`.
    - Retains `slug: "circlehub-mobile"` across all environments to preserve EAS project linkage and Expo routing.
  - Updated `eas.json` to define `"env": { "APP_NAME": "CircleHub" }` under `development`, `preview`, and `production` build profiles.

---

## 14. Fix Stuck Message Skeletons in Mobile Conversation Thread

### Symptom
When opening a conversation in CircleHub, the latest message appeared immediately, but previous messages remained stuck on skeleton loaders (`<View className="h-3 w-28 rounded-full bg-surface-high" />`) instead of displaying their actual content.

### Root Cause
1. **Why the latest message appeared immediately:**
   - On the `/messages` conversation list screen (`ConversationRow`), `useDecryptedContent(last?.content)` runs ahead of time and stores the decrypted text in module-level `settledCache`.
   - Or if recently sent/received over SignalR, the content is pre-decrypted or pre-seeded in `settledCache`.
   - When the user opens `/messages/[id]`, `peekDecrypted(content)` immediately finds the latest message in `settledCache` synchronously on mount, returning `{ text, isPending: false }` with zero skeleton display.
2. **Why previous messages were stuck on skeleton loaders:**
   - **Hook State Desync & Cell Recycling:** `useDecryptedContent.ts` initialized its state once via `useState(() => ...)`. When `FlatList` recycled cell instances or updated items, the hook compared `resolved.source === content && resolved.version === cacheVersion`. When `content` changed, this check failed and fell through to `return { text: "", isPending: true }`. Furthermore, comparing `resolved.version === cacheVersion` meant any cache version increment (e.g., from key sync) permanently trapped previously resolved messages in a pending state.
   - **Missing Error Handling (`.catch()`):** In `useDecryptedContent.ts`, `decryptMessageContent(content).then(...)` had no `.catch()` handler. If an error or curve point mismatch occurred, `.then()` never executed and `isPending` remained `true` forever.
   - **Unhandled Elliptic Curve Point Derivation Errors:** In `src/services/messageCrypto.ts`, `wrapKeyFor` called `deriveWrapKey` directly. If an envelope contained a point not on the P-256 curve (or a malformed public key), `p256.getSharedSecret` threw `bad point: is not on curve`. Because `wrapKeyFor` had no try/catch, the exception escaped `decryptEnvelope` and caused the promise to reject.
   - **Omission of `UNREADABLE_PLACEHOLDER` from `settledCache`:** `decryptMessageContent` intentionally skipped `settledCache.set` when the text was `UNREADABLE_PLACEHOLDER` and deleted it from `decryptCache`. As a result, `peekDecrypted(content)` was permanently `null` for unreadable messages, causing continuous expensive re-decryption loops and leaving recycled cells in skeleton states.
   - **Storage Concurrency Bottleneck:** When opening a thread with 50 messages, all 50 `useDecryptedContent` hooks called `loadStoredKeys()` concurrently while `memoryKeys` was `null`, firing 50 simultaneous native calls to `SecureStore.getItemAsync` on Android.

### Fix
- **Files:**
  - `src/services/messageCrypto.ts`
  - `src/hooks/useDecryptedContent.ts`
  - `src/components/messages/messagethread.tsx`
  - `__tests__/hooks/useDecryptedContent.test.tsx` (new)
  - `__tests__/lib/messageCryptoDecrypt.test.ts`
- **Changes:**
  - **`src/services/messageCrypto.ts`:**
    - Deduplicated in-flight storage reads with `loadKeysPromise` so multiple concurrent message decryptions share a single `SecureStore.getItemAsync` call.
    - Wrapped `deriveWrapKey` in a `try/catch` in `wrapKeyFor` returning `null` on failure, allowing the sweep to continue checking other candidate keys without crashing.
    - Wrapped `decryptEnvelope` in `decryptFresh` with a `try/catch` returning `UNREADABLE_PLACEHOLDER`.
    - In `decryptMessageContent`, added `.catch(() => UNREADABLE_PLACEHOLDER)`, stored settled results in `settledCache` (bounded by `DECRYPT_CACHE_LIMIT`), and cleared in-flight entries from `decryptCache` in `.finally()`.
  - **`src/hooks/useDecryptedContent.ts`:**
    - Simplified hook state to track `{ content, text, isPending }`.
    - Checked `peekDecrypted(content)` directly during render so already settled messages return `{ text: settled, isPending: false }` immediately on mount.
    - Added `.catch(() => setResolved({ content, text: UNREADABLE_PLACEHOLDER, isPending: false }))` so errors or unreadable messages always transition out of `isPending: true`.
    - Removed the brittle `version` equality guard that caused false-positive infinite loading.
  - **`src/components/messages/messagethread.tsx`:**
    - Added `key={item.id}` to the list row wrapper in `FlatList.renderItem` to ensure React maintains component identity by message ID.
  - **Tests:**
    - Added unit test suite in `__tests__/hooks/useDecryptedContent.test.tsx` covering plaintext, null/undefined, async decryption transition, settled cache fast-path, rejection handling, and FlatList cell recycling.
    - Added tests in `__tests__/lib/messageCryptoDecrypt.test.ts` verifying non-curve public key safety and settled placeholder caching.

---

## 16. Web App Architecture Parity & Mobile Messaging Performance Optimization

### Symptoms
Following batch pre-decryption and inbox pre-warming:
1. Tapping the Messages tab took approximately 2 seconds to open.
2. Opening a conversation took approximately 3 seconds (and up to 6.7 seconds on cold history load).
3. React Native emitted slow `VirtualizedList` updates (`dt: 815, prevDt: 1197`).
4. Hermes single-threaded CPU contention occurred during bulk P-256 BigInt modular scalar multiplication.

### Comparative Root Cause Analysis (Web vs. React Native Mobile)
1. **Web Reference Architecture (`CircleHub/src`)**:
   - `useConversation.jsx`: `queryFn` executes `getConversation(id, { page, pageSize })` and immediately returns `data` without awaiting message decryption. Network roundtrip takes ~200ms, and the screen layout and header render immediately.
   - `useDecryptedContent.jsx`: Decrypts messages asynchronously per bubble using browser WebCrypto (`crypto.subtle`). WebCrypto runs in multi-threaded native C++ browser code taking <0.1ms per message.
   - `ConversationList.jsx`: Performs **no background thread prefetching**. Opening `/messages` simply renders conversation previews.
2. **Mobile Bottlenecks**:
   - **Inbox Prefetch Storm**: On mounting `ConversationList`, mobile prefetched the top 3 threads. With 50 messages per thread, Hermes initiated 150 P-256 scalar multiplications on its single JavaScript thread. Because Hermes lacks native WebCrypto and uses pure JS BigInts (`@noble/curves`), this 150-message storm saturated the event loop and froze navigation for 2 seconds.
   - **Query Resolution Blocking**: `fetchConversationThread` blocked `useInfiniteQuery` on `await Promise.all(50 decryptMessageContent)`. Because the query remained unresolved for 6.7 seconds, `MessageThreadScreen` remained trapped in `<MessageThreadSkeleton />`.
   - **Unbounded Concurrency & VirtualizedList Churn**: When 50 items mounted without pagination limits (`initialNumToRender`), `FlatList` virtualized all 50 unmemoized rows simultaneously, generating long tasks that triggered `VirtualizedList: You have a large list that is slow to update`.
   - **Key Candidate Ordering**: In `decryptEnvelope`, candidate keys were tried in arbitrary storage order instead of prioritizing the active `currentDeviceId` at index 0, forcing quadratic derivations.

### Fix & Web Architectural Alignment
- **Files:**
  - `src/services/messageCrypto.ts`
  - `src/hooks/useConversation.ts`
  - `src/components/messages/conversationlist.tsx`
  - `src/components/messages/messagethread.tsx`
  - `src/hooks/useDecryptedContent.ts`
- **Changes:**
  - **Non-Blocking Query Resolution (`useConversation.ts`)**:
    Aligned with the web reference: `fetchConversationThread` fetches `getConversation` over HTTP, attaches any already settled cached plaintexts synchronously, and immediately resolves the query (~200ms).
  - **Eliminated Inbox Prefetch Storm (`conversationlist.tsx`)**:
    Removed the 3-thread background prefetching `useEffect` from `ConversationList`. Opening the Messages tab now renders in 1.6ms without CPU starvation. Preserved `onPressIn` network prefetch for the specific touched thread.
  - **Progressive Visible-First Decryption Queue (`messageCrypto.ts`)**:
    Built a cooperative priority queue with event loop yielding (`setTimeout(0)`):
    - Visible messages (first 12 in the viewport) are enqueued with high priority (10) and decrypt within ~150–200ms.
    - Offscreen older messages decrypt progressively in the background with low priority (1), yielding to the event loop after every message to keep Hermes at 60 FPS.
    - When the user scrolls, `useDecryptedContent` bumps the priority of newly visible messages.
    - Coalesced cache store notifications with `scheduleNotifyDecryptCacheChanged`.
  - **Active Device Key Prioritization & Pre-Decoding (`messageCrypto.ts`)**:
    Pre-decoded `secretKeyBytes` once on `memoryKeys` load, and placed `currentDeviceId` candidate at index 0, guaranteeing immediate first-try wrap authentication without redundant trial derivations.
  - **FlatList & Component Memoization (`messagethread.tsx`)**:
    - Wrapped `MessageBubble` in `React.memo`.
    - Configured `FlatList` with `initialNumToRender={12}`, `maxToRenderPerBatch={10}`, `windowSize={7}`, and `removeClippedSubviews={Platform.OS === "android"}`.
    - Memoized `keyExtractor`, `renderItem`, `handleRetry`, and `transmitMessage` with `useCallback`.
  - **Individual Message Updates (`useDecryptedContent.ts`)**:
    Utilized `useSyncExternalStore` and `decryptMessageContent(content, 10)` so settling an individual message updates only that message bubble without re-rendering the conversation list.

### Verified Measurements (Android Emulator `emulator-5554`)
- **Messages Tab Opening**:
  - *Before:* ~2,000ms (frozen by 150-message background crypto storm).
  - *After:* **1.6ms** (instant render).
- **Conversation Screen Opening**:
  - *Before:* 6,772.8ms (trapped in `MessageThreadSkeleton` awaiting all 50 messages).
  - *After:* **555.0ms** (instant screen layout + immediate visible message render).
- **VirtualizedList Performance**:
  - *Before:* `VirtualizedList: You have a large list that is slow to update - dt: 815, prevDt: 1197`.
  - *After:* **0 warnings**; completely smooth 60 FPS scrolling and frame updates.
- **Test Suite**:
  - `npm test`: 15 passed, 15 total (104 passed).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors, 0 warnings.


---

## 16. Instant Instagram-Style All-Messages Conversation Loading & Pre-Decryption

### Symptom
When opening a conversation for the first time, only the single most recent message appeared immediately, while previous messages popped in sequentially or briefly flashed skeleton loaders instead of displaying all conversation messages simultaneously and instantly (like Instagram or WhatsApp).

### Root Cause
1. **Asymmetric Cache Seeding:**
   - On the `/messages` conversation list screen, `ConversationRow` mounted `useDecryptedContent(conversation.lastMessage?.content)`. This seeded `settledCache` with *only* the single latest message.
   - When the user navigated into `/messages/[id]`, React Query's `useInfiniteQuery` fetched the thread messages from the backend API, where all message contents were encrypted ciphertexts.
   - When the query resolved, `<MessageThread>` immediately mounted:
     - Message index `0` (the latest message) hit `peekDecrypted(content)` in `settledCache` synchronously on frame 0 and rendered its text immediately.
     - Messages `1` through `49` were not yet in `settledCache`. Each individual `MessageBubble` mounted `useDecryptedContent`, initiating independent asynchronous BigInt ECDH decryption operations on Hermes. Until each individual operation completed, each bubble rendered a skeleton loader, creating an undesirable "pop-in" effect where only the newest message was visible initially.
2. **Lack of List-Level Prefetching and Pre-Warming:**
   - Navigating to a thread initiated fetching and cryptographic processing only *after* the screen transition began.
   - Tapping an inbox conversation suffered from both network roundtrip latency and subsequent on-device decryption delays.

### Fix
- **Files:**
  - `src/hooks/useConversation.ts`
  - `src/components/messages/conversationlist.tsx`
  - `src/components/messages/messagethread.tsx`
- **Changes:**
  - **`src/hooks/useConversation.ts`:**
    - Created and exported `fetchConversationThread(conversationId, pageParam, pageSize)` which wraps `getConversation`.
    - Integrated `Promise.all` batch pre-decryption: before resolving the query result, every message in the fetched page is concurrently decrypted via `decryptMessageContent(m.content)`.
    - Stored the decrypted text in module-level `settledCache` and attached `plaintext` directly to the `Message` object.
    - Updated `useInfiniteQuery` to use `fetchConversationThread` with a 30-second `staleTime`.
  - **`src/components/messages/conversationlist.tsx`:**
    - Added `usePrefetchTopThreads`: on mounting the inbox screen, the top 3 most recent conversations are prefetched and pre-decrypted in the background using `queryClient.prefetchInfiniteQuery`.
    - Added `onPressIn` touch pre-warming to `ConversationRow`: touching a conversation row immediately initiates query fetching and message pre-decryption before the `onPress` navigation event completes.
  - **`src/components/messages/messagethread.tsx`:**
    - Updated `MessageBubble` to read `displayText = message.plaintext ?? decryptedText`. Because `message.plaintext` is pre-populated during query fetching, the very first render frame has the full text ready synchronously for all visible messages.
    - Updated skeleton condition to `isActuallyDecrypting = !message.plaintext && isDecrypting`, ensuring no skeleton is ever rendered when plaintext is already available.
- **Verification:**
  - Validated live on the active Android emulator (`emulator-5554`):
    - Opening conversations (e.g. Nasr Elshamekh with 170+ messages, Alice Wonder with mixed shared posts) instantly displays all visible messages with their full decrypted plaintext on the very first frame.
    - Zero skeleton bubbles appear in the thread.
    - Preserved full E2EE boundaries: all decryption takes place purely in client memory on authorized devices; no plaintext is exposed or stored insecurely.

---

## 17. Mobile Left-to-Right Swipe Sidebar Drawer Modal Navigation

### Symptom / Request
The user requested a modal similar to the "create a post" modal, but opening from left to right when swiping left-to-right, showing all navigation links present in the web application's left sidebar (`Home`, `Profile`, `Explore`, `Followers`, `Communities`, `Messages`, `Notifications`, `Settings`), sized comfortably to fill the content with breathing room, and closing when swiping right-to-left.

### Implementation
- **Files Created / Modified:**
  - `src/context/sidebardrawercontext.tsx` (new)
  - `src/components/sidebar/sidebardrawer.tsx` (new)
  - `src/app/(tabs)/_layout.tsx`
  - `src/components/header.tsx`
- **Key Details:**
  1. **Architecture & State:**
     - Created `SidebarDrawerContext` providing `openSidebar`, `closeSidebar`, and `isOpen` to anywhere in the app hierarchy.
     - Wrapped `<Tabs>` inside `<SidebarDrawer>` in `src/app/(tabs)/_layout.tsx`.
     - Connected the CircleHub logo in `src/components/header.tsx` to `openSidebar()`.
  2. **Gestures & Animations:**
     - Left-to-right swipe detection (`openPanResponder` with `x0 <= 80` and `dx > 15`) and a dedicated 24dp left edge strip (`edgeStripPanResponder`) allow effortless gesture activation without conflicting with vertical scrolling in feeds or lists.
     - Smooth 60 FPS native-driven spring and timing animations for drawer translation (`translateX: -DRAWER_WIDTH -> 0`) and backdrop dimming (`backdropOpacity: 0 -> 0.55`).
     - Interactive right-to-left swipe dismissal (`closePanResponder`) tracking finger drag coordinates with threshold snap-back or close.
     - Dismissible via dimmed backdrop tap, top X button, or Android hardware back button.
  3. **Content, Styling & Safe Area Constraints:**
     - Width sized to content (`Math.min(295, Math.round(SCREEN_WIDTH * 0.78))`).
     - Constrained strictly between `top: insets.top` and `bottom: insets.bottom`, keeping the drawer and backdrop from overlapping the system status bar and Android OS bottom navigation bar.
     - Borders removed from panel, header, and footer for a clean, seamless modal appearance.
     - Header: CircleHub brand logo and circular close button matching the compose modal styling.
     - User Card: Profile avatar, full name, and `@username` handle navigating to profile.
     - 8 Web-matching Navigation Links with Lucide icons, active route highlight, and real-time unread badges (Messages, Notifications).
     - Footer: Theme toggle (`Light Mode` / `Dark Mode`) and `Sign Out`.
---

## 18. Mobile Real-Time Notification Delivery & "Seen" Stamp Behavior Fix

### Symptom
On the mobile app, when a notification arrived, the red badge on the header bell icon appeared for ~0.5s and then immediately vanished without the user opening the notifications screen.

### Root Cause
1. **`useFocusEffect` Dependency Invalidation:**
   - In `src/app/(tabs)/notifications.tsx`, `useFocusEffect` used `useCallback(..., [isLoading, unreadCount, markSeen])`.
   - Whenever a new notification arrived, `unreadCount` changed (e.g. 0 &rarr; 1). This invalidated the `useCallback` reference.
   - React Navigation's `useFocusEffect` ran the previous effect's cleanup: `stampedVisitRef.current = false`.
   - React immediately executed the newly created callback, which saw `!stampedVisitRef.current && unreadCount > 0` and fired `markSeen.mutate()`.
   - `markSeen.mutate()` sent `POST /api/Notifications/seen` and optimistically zeroed `unreadCount` in the cache, clearing the badge almost immediately (~300–500ms after arrival).
2. **SignalR Notification Pipeline:**
   - In `src/context/chatconnectioncontext.tsx`, `connection.on(NOTIFICATION_CREATED_EVENT)` discarded the payload and only called `queryClient.invalidateQueries`.
   - It did not immediately update the cache data with the received notification payload.

### Fix
- **Files:**
  - `src/app/(tabs)/notifications.tsx`
  - `src/context/chatconnectioncontext.tsx`
  - `src/hooks/useDecryptedContent.ts`
  - `src/components/sidebar/sidebardrawer.tsx`
  - `test/useConversation.test.ts`
- **Changes:**
  - **`src/app/(tabs)/notifications.tsx`:**
    - Decoupled `useFocusEffect` from `unreadCount` changes so it never re-runs or resets cleanup mid-visit.
    - Used `isFocusedRef` to ensure `markSeen.mutate()` is only ever invoked once per focus session when the user actually visits the notifications screen.
    - Added an effect that handles asynchronous initial loading while focused, guaranteeing that once stamped, `stampedVisitRef.current` remains `true` throughout the visit and cannot clear mid-visit arrivals.
  - **`src/context/chatconnectioncontext.tsx`:**
    - Updated `NOTIFICATION_CREATED_EVENT` handler to accept `NotificationItem`.
    - Optimistically prepended the incoming notification to page 0 and incremented `unreadCount` immediately before initiating the background `invalidateQueries` refetch.
  - **`src/hooks/useDecryptedContent.ts`:**
    - Corrected initial `isPending` state computation to `isEncrypted && settled === null`.
---

## 19. Private Community Member Roster Exposure Fix (`GetCommunityBySlug`)

### Vulnerability / Symptom
Any authenticated user could request a private community by slug (`GET /api/Communities/{slug}`) and receive its entire member roster, including internal user IDs, usernames, locations, roles, and join dates, even without being a member of that private community.

### Root Cause
In `CommunitiesController.cs`, `GetCommunityBySlug` unconditionally projected `c.Members` into `CommunityDetailsDto.Members` regardless of whether the community had `c.Visibility == CommunityVisibility.Private` or whether the caller was a member.

### Fix
- **File:** `CircleHub.Api/Controllers/CommunitiesController.cs`
- **Changes:**
  - Updated `GetCommunityBySlug` to evaluate membership (`IsMember = c.AdminId == currentUserId || c.Members.Any(m => m.UserId == currentUserId)`).
  - Only populates `Members` if the community is public (`c.Visibility == CommunityVisibility.Public`) or if the caller is an active member or administrator.
  - Returns an empty list (`[]`) for non-members of private communities, eliminating the member data exposure while keeping the community header metadata (name, slug, category, description, and counts) intact.
- **Verification:**
  - `dotnet build`: 0 warnings, 0 errors.
  - `dotnet publish -c Release`: succeeded cleanly.
  - `npm test` (mobile): 16/16 test suites passed, 107/107 unit tests passed.
  - `npm run build` (web): production bundle compiled cleanly in 6.16s.

---

## 20. Conversation Background Read-Stamp & Premature Header Badge Clearing

### Symptom
On the mobile app, when receiving a new message without opening the conversation, the unread badge on the header stayed visible as expected. However, after opening the conversation thread, navigating away (e.g. back to the Home tab), and then receiving another message in that conversation, the unread badge would appear on the header for ~500ms and then immediately disappear without opening the conversation.

### Root Cause
1. **Screen Retained in Memory in Tab Navigator:**
   - In Expo Router's `<Tabs>`, screens such as `src/app/(tabs)/messages/[id].tsx` stay mounted in the background when the user navigates away to another tab or to Home.
2. **Prefix Invalidation in SignalR Handler:**
   - In `src/context/chatconnectioncontext.tsx`, the `RECEIVE_MESSAGE_EVENT` handler called `queryClient.invalidateQueries({ queryKey: queryKeys.conversations() })` without `exact: true`.
   - In TanStack Query, `queryKeys.conversations()` (`["messages", "conversations"]`) is the key prefix of `queryKeys.conversation(id)` (`["messages", "conversations", id]`).
   - Because `messages/[id]` remained mounted in the background, React Query considered the thread query active and immediately refetched `fetchConversationThread(id)` (`GET /api/messages/{id}`).
3. **Backend Read-Stamp on Fetch:**
   - On the backend, `GET /api/messages/{id}` automatically updates `mine.LastReadAt = DateTime.UtcNow` under the assumption that fetching the conversation means the user is actively viewing it.
   - When the refetch finished, `useConversation`'s effect detected data changes and triggered a refetch of `queryKeys.conversations()`. The server recalculated unread counts using the updated `LastReadAt`, returning `UnreadCount: 0`.
   - The header recalculated `unreadCount` to 0, clearing the unread badge ~500ms after arrival.

### Fix
- **Files:**
  - `src/context/chatconnectioncontext.tsx`
  - `src/app/(tabs)/messages/[id].tsx`
  - `src/hooks/useConversation.ts`
  - `src/hooks/mutations/useSendMessage.ts`
  - `test/useConversation.test.ts`
- **Changes:**
  - **`chatconnectioncontext.tsx`:** Added `exact: true` to `queryKeys.conversations()` invalidation on `RECEIVE_MESSAGE_EVENT` and `onreconnected`, preventing prefix-matching of conversation threads. Extracted `conversationId` from the SignalR message payload and invalidated `queryKeys.conversation(conversationId)` with `refetchType: "active"` so only an actively open thread refetches.
  - **`messages/[id].tsx`:** Added `useFocusEffect` to track `isFocused` state and passed `{ enabled: isFocused }` to `useConversation`. Enhanced `goBack()` to use `router.back()` when possible.
  - **`useConversation.ts`:** Supported `hookOptions?: { enabled?: boolean }`. When `enabled: false`, disables the infinite query so TanStack Query never refetches in the background when not focused. Guarded `conversations()` invalidation with `isEnabled`.
  - **`useSendMessage.ts`:** Added `exact: true` to `queryKeys.conversations()` invalidation upon send success.
  - **`test/useConversation.test.ts`:** Added unit test verifying that `enabled: false` prevents background queries from fetching.
- **Verification:**
  - `npm test`: 16/16 test suites passed, 104/104 unit tests passed.
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 warnings/errors.

---

## 21. Private Community Discovery & Membership Leakage Across Directory, Search, and Profiles

### Vulnerability / Symptom
1. `GET /api/Communities`: Listed private communities to all users, including non-members.
2. `GET /api/Search`:
   - Text search query returned private communities to non-members.
   - Blank search query suggested private communities to non-members.
3. `GET /api/Users/{username}/communities`: Revealed all community memberships on public profiles, exposing private communities that the viewer was not a member of.

### Root Cause
1. In `CommunitiesController.cs` (`GetCommunities`), `_db.Communities` was queried and counted without checking `c.Visibility == CommunityVisibility.Public` or community membership.
2. In `SearchController.cs` (`Search`), text searches lacked a visibility filter on `_db.Communities`, and empty-query community suggestions explicitly selected non-joined communities without ensuring they were public.
3. In `UsersController.cs` (`GetUserCommunities`), `_db.CommunityMembers` projected all memberships for a user without verifying that the requesting caller was authorized to see the private community.

### Fix
- **Files:**
  - `CircleHub.Api/Controllers/CommunitiesController.cs`
  - `CircleHub.Api/Controllers/SearchController.cs`
  - `CircleHub.Api/Controllers/UsersController.cs`
- **Changes:**
  - **`CommunitiesController.cs` (`GetCommunities`):**
    - Filtered communities by `c.Visibility == CommunityVisibility.Public || c.AdminId == currentUserId || c.Members.Any(m => m.UserId == currentUserId)`.
    - Computed `total` count and pagination meta from the filtered query so private communities are completely hidden from non-members.
  - **`SearchController.cs` (`Search`):**
    - Text query: Added `.Where(c => c.Visibility == CommunityVisibility.Public || c.AdminId == currentUserId || c.Members.Any(m => m.UserId == currentUserId))` so non-members cannot discover private communities via search.
    - Empty query: Added `.Where(c => c.Visibility == CommunityVisibility.Public)` so recommendations only suggest public communities.
  - **`UsersController.cs` (`GetUserCommunities`):**
    - Filtered memberships by `m.Community.Visibility == CommunityVisibility.Public || user.Id == currentUserId || m.Community.AdminId == currentUserId || m.Community.Members.Any(mem => mem.UserId == currentUserId)`.
    - Viewers only see public communities, unless they are also a member/admin of the private community, or viewing their own profile.
- **Verification:**
  - `dotnet build`: 0 warnings, 0 errors.
  - Backend API server running with updated endpoints.
  - `npm test` (mobile): 16/16 test suites passed, 104/104 unit tests passed.

---

## 22. Private-Post Interaction Bypass Fix (`ToggleLike`)

### Vulnerability / Symptom
Any authenticated user who knew the GUID of a private post (e.g., inside a private community they were not a member of, or from a user whose posts are restricted to followers) could send `PATCH /api/posts/{id}/like` to like or unlike the post and trigger like notifications to the post owner.

### Root Cause
In `PostsController.cs`, `ToggleLike` queried `_db.Posts.Where(p => p.Id == id)` without calling `WhereVisibleTo(userId)`. Unlike `GetPost` and `AddComment` which verified caller visibility before processing, `ToggleLike` only checked that the post existed in the database.

### Fix
- **File:** `CircleHub.Api/Controllers/PostsController.cs`
- **Changes:**
  - Added `.WhereVisibleTo(userId)` to the post lookup in `ToggleLike`:
    ```csharp
    var postAuthorId = await _db.Posts
        .Where(p => p.Id == id)
        .WhereVisibleTo(userId)
        .Select(p => (Guid?)p.AuthorId)
        .FirstOrDefaultAsync();
    if (postAuthorId is null)
        return Fail(StatusCodes.Status404NotFound, "Post not found");
    ```
  - Unauthorized callers receive a 404 "Post not found" response, matching `GetPost` and `AddComment` and completely blocking unpermitted interaction.
- **Verification:**
  - `dotnet build`: 0 warnings, 0 errors.
  - Backend server restarted and running on port 5289.

---

## 23. Forwarded-Header Spoofing & HTTPS Redirection Bypass Hardening

### Vulnerability / Symptom
The application cleared its trusted proxies/networks and removed hop limits:
```csharp
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    ForwardLimit = null,
    KnownIPNetworks = { },
    KnownProxies = { }
});
```
This allowed any direct HTTP client on the internet to send `X-Forwarded-Proto: https`, tricking the server into treating unencrypted HTTP traffic as HTTPS. This allowed callers to bypass `app.UseHttpsRedirection()` and transmit sensitive bearer authentication tokens over cleartext HTTP.

### Root Cause
Explicitly emptying `KnownIPNetworks` and `KnownProxies` while setting `ForwardLimit = null` disables proxy verification, in violation of Microsoft security guidelines for reverse proxies and load balancers.

### Fix
- **Files:**
  - `CircleHub.Api/Program.cs`
  - `CircleHub.Api/appsettings.json`
- **Changes:**
  - In `Program.cs`, configured `ForwardedHeadersOptions` via `builder.Services.Configure<ForwardedHeadersOptions>`:
    - Set `ForwardLimit = 1` (default 1-hop proxy limit).
    - Preserved default loopback entries in `KnownProxies` and `KnownIPNetworks` (`127.0.0.1`, `::1`).
    - Bound `KnownProxies` and `KnownNetworks` to configuration under `"ForwardedHeaders"` so trusted reverse proxies (e.g. IIS, Nginx, or cloud load balancers) can be safely configured without trusting arbitrary clients.
    - Simplified middleware invocation to `app.UseForwardedHeaders()`.
  - In `appsettings.json`, added the `"ForwardedHeaders"` configuration section with empty arrays for optional proxy/network specification.
- **Verification:**
  - `dotnet build`: 0 warnings, 0 errors.
  - Backend daemon restarted and listening on port 5289.

---

## 24. Application-Wide and Policy-Based Request Rate Limiting

### Vulnerability / Symptom
The API had no request rate limiting configured (`AddRateLimiter`, `UseRateLimiter`). Sensitive endpoints including login, registration, password reset, image upload, and messaging/SignalR relays could be flooded without throttling, leaving BCrypt password verification vulnerable to credential stuffing and CPU exhaustion attacks.

### Root Cause
Missing ASP.NET Core rate limiting middleware, global partitioned limiter, and policy-based endpoint protection.

### Fix
- **Files:**
  - `CircleHub.Api/Program.cs`
  - `CircleHub.Api/Services/MessageRelayRateLimiter.cs` (new)
  - `CircleHub.Api/Hubs/ChatHub.cs`
  - `CircleHub.Api/Controllers/AuthController.cs`
  - `CircleHub.Api/Controllers/MessagesController.cs`
  - `CircleHub.Api/Controllers/PostsController.cs`
  - `CircleHub.Api/Controllers/CommunitiesController.cs`
  - `CircleHub.Api/Controllers/UsersController.cs`
- **Changes:**
  - **`Program.cs`:**
    - Configured `builder.Services.AddRateLimiter`:
      - Standard 429 response callback returning JSON `ApiErrorResponse` and `Retry-After` header.
      - `GlobalLimiter`: Sliding window limiter (120 requests/min, 4 segments) partitioned by user ID (authenticated) or remote IP (anonymous).
      - Policy `"auth"`: Fixed window limiter (10 attempts/min, queue limit 0) partitioned by client IP to block brute force and BCrypt CPU exhaustion.
      - Policy `"upload"`: Fixed window limiter (15 uploads/min) partitioned by user ID to prevent disk and CPU saturation.
      - Policy `"messages"`: Token bucket limiter (20 burst, 1 token/2s refill) partitioned by user ID.
    - Registered `app.UseRateLimiter()` after `UseAuthentication()` and `UseAuthorization()` so `HttpContext.User` is accessible.
  - **`Services/MessageRelayRateLimiter.cs` & `ChatHub.cs`:**
    - Implemented a per-connection token bucket limiter (capacity 15, refill 1/s) for `SendEncryptedMessage` to protect SignalR WebSocket relays from flooding. Disconnects clean up active connection buckets.
  - **Controllers:**
    - Added `[EnableRateLimiting("auth")]` to `AuthController` with `[DisableRateLimiting]` on `GetCurrentUser` for session hydration.
    - Added `[EnableRateLimiting("messages")]` to `MessagesController` (`SendMessage`, `GetOrCreateDirectConversation`).
    - Added `[EnableRateLimiting("upload")]` to image upload endpoints in `PostsController`, `CommunitiesController`, and `UsersController`.
- **Verification:**
  - `dotnet build`: 0 warnings, 0 errors.
  - Automated test verified: 8 requests return 401; request 9+ immediately returns HTTP 429 `Too many requests. Please try again later.` with `Retry-After: 60`.
  - Mobile test suite: 16/16 test suites passed, 104/104 tests passed.

---

## 25. Static Files Middleware Ordering Before HTTPS Redirection

### Vulnerability / Symptom
In `Program.cs`, `app.UseStaticFiles()` was placed before `app.UseHttpsRedirection()`. If the server had an HTTP binding, static asset requests (including user avatars, post images, and community uploads under `/uploads/...`) were served over plain unencrypted HTTP instead of being redirected to HTTPS.

### Root Cause
Middleware pipeline ordering violated Microsoft guidance: static files middleware short-circuits requests before downstream middleware like `UseHttpsRedirection` can inspect the scheme and issue a 307/308 redirect.

### Fix
- **File:** `CircleHub.Api/Program.cs`
- **Changes:**
  - Moved `app.UseCors("AllowAll")` and `app.UseHttpsRedirection()` before `app.UseStaticFiles()`:
    ```csharp
    app.UseCors("AllowAll");
    app.UseHttpsRedirection();

    app.UseStaticFiles(new StaticFileOptions
    {
        ContentTypeProvider = contentTypeProvider,
        ServeUnknownFileTypes = false
    });
    ```
  - Any request arriving over HTTP for `/uploads/...` is now immediately redirected to HTTPS before static file handling, while ensuring CORS headers are present on static responses.
- **Verification:**
  - `dotnet build`: 0 warnings, 0 errors.
  - Backend daemon restarted on port 5289.


---

## 26. Mobile API URL Normalization & Double `/api` 404 Prevention

### Symptom
When attempting to sign in (`POST /api/Auth/login`) or create an account (`POST /api/Auth/register`) on the mobile app, the submission immediately failed and displayed a red banner with:
`Request failed with status 404`

### Root Cause
1. **Double `/api` Concatenation from EAS Build Config:**
   - In `eas.json`, `preview` and `production` build profiles defined `"EXPO_PUBLIC_API_URL": "https://circlehub.runasp.net/api"`.
   - In the mobile app's API services (`src/api/*.ts`), all routes explicitly prefix endpoints with `/api/` (e.g. `apiFetch("/api/Auth/login")`, `apiFetch("/api/Posts")`).
   - In `src/api/client.ts`, requests are constructed as `fetch(`${API_URL}${endpoint}`)`.
   - When combined, requests hit `https://circlehub.runasp.net/api/api/Auth/login`. Because this route does not exist in ASP.NET Core, IIS returned an empty HTTP 404.
2. **Missing Normalization on Trailing Slashes:**
   - In `src/config/env.ts`, `API_URL` was assigned directly from `process.env.EXPO_PUBLIC_API_URL` without sanitization. If configured with a trailing slash (e.g. `http://circlehub.runasp.net/`), concatenation produced `http://circlehub.runasp.net//api/Auth/login` (double slash `//`), which IIS also returns 404 for.
3. **Unparseable 404 Bodies Fallback:**
   - `client.ts` attempts to parse error bodies with `response.json()`. Because IIS returns 404 with 0 bytes or an HTML page, `readErrorBody` returns `null`, causing `messageFromBody` to fallback to the literal string `"Request failed with status 404"`.

### Fix
- **Files:**
  - `src/config/env.ts`
  - `eas.json`
  - `CircleHub/src/context/ChatConnectionContext.jsx` (web parity)
- **Changes:**
  - **`src/config/env.ts`:**
    - Added defensive regex cleanup to automatically strip trailing slashes and trailing `/api`:
      ```ts
      const rawUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.2:5289";
      const API_URL = rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");
      export { API_URL };
      ```
  - **`eas.json`:**
    - Changed `preview` and `production` environments from `"https://circlehub.runasp.net/api"` to `"https://circlehub.runasp.net"`.
  - **`CircleHub/src/context/ChatConnectionContext.jsx`:**
    - Updated web chat invalidation to use `{ exact: true }` on `queryKeys.conversations()` and specifically invalidate `queryKeys.conversation(message.conversationId)` for complete architectural consistency with mobile.
- **Verification:**
  - `npm test`: 16/16 test suites passed (104/104 tests).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors, 0 warnings.
  - Web Vite build (`npm run build`): 0 errors, built in 6.24s.
  - Live probe against `https://circlehub.runasp.net/api/Posts` and `https://circlehub.runasp.net/api/Auth/login` verified 200 OK and 401 Unauthorized (proper controller response).


---

## 27. Android Adaptive Icon Scaling & Safe Zone Padding

### Symptom
When installing the generated APK on an Android device, the CircleHub app icon appeared visibly cropped: the outer curves and top/bottom edges of the interlocking circles were cut off by Android's circular, squircle, or rounded-square launcher masks.

### Root Cause
1. In `app.json`, `android.adaptiveIcon.foregroundImage` pointed to `./assets/images/circlehub-icon.png`.
2. `circlehub-icon.png` was created with content bounds extending to 96.3% of the canvas width (content width 712px on a 739px canvas).
3. Android Adaptive Icon specifications designate the inner 66dp of a 108dp canvas (~61.1% diameter) as the "safe zone". Modern Android OEM launchers (Samsung One UI, Pixel Launcher, MIUI, etc.) mask the foreground image into a circle, squircle, or rounded rectangle, cutting off anything outside the safe zone.
4. Because the artwork occupied 96% of the canvas, the outer ~35% of the artwork was masked off by the launcher.

### Fix
- **Files:**
  - `assets/images/circlehub-adaptive-foreground.png` (new)
  - `assets/images/circlehub-app-icon.png` (updated)
  - `app.json`
- **Changes:**
  - Generated `circlehub-adaptive-foreground.png` (1024x1024 transparent PNG) with the CircleHub logo centered at 500x323px (~48.8% width). This places the entire mark comfortably inside Android's 61% safe zone with clean, balanced breathing room.
  - Re-rendered `circlehub-app-icon.png` (1024x1024 white background) with the same safe proportions for legacy launchers and stores.
  - Updated `app.json` so `android.adaptiveIcon.foregroundImage` points to `./assets/images/circlehub-adaptive-foreground.png`.
- **Verification:**
  - Visual circle mask and squircle mask previews generated and verified.
  - `npm test`: 16/16 test suites passed (104/104 tests).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.


---

## 28. Conversation Thread Back Navigation Fixed to Target `/messages`

### Symptom
When inside an active conversation thread (`src/app/(tabs)/messages/[id].tsx`), pressing the top-left back button (or using the Android system back button) navigated the user back to the Home Feed tab instead of returning to the conversations list (`/messages`).

### Root Cause
1. In Expo Router's `<Tabs>`, all screens in `(tabs)/_layout.tsx` belong to the same tab navigator without a nested stack navigator.
2. React Navigation Tabs defaults `backBehavior` to `"firstRoute"` (which is the Home Feed tab `index`).
3. Calling `router.back()` popped across the tab boundary back to `index` rather than navigating to the sibling `/messages` screen.

### Fix
- **File:** `src/app/(tabs)/messages/[id].tsx`
- **Changes:**
  - Updated `goBack()` to explicitly call `router.replace("/messages")`.
  - Added Android hardware `BackHandler` listener inside a focused effect to route system back gestures directly to `/messages`.
- **Verification:**
  - `npm test`: 16/16 test suites passed (104/104 tests).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.

---

## 29. Firebase Cloud Messaging (FCM V1) Configuration for Android Push Notifications

### Overview
To enable background push notifications when the mobile app is closed on Android standalone APK builds, Google Firebase Cloud Messaging (FCM V1) was linked to the project.

### Changes
- **Files:**
  - `google-services.json` (added to project root)
  - `app.json`
- **Configuration:**
  - Configured `google-services.json` (Project ID: `circlehub-95e2a`, Package: `com.nasrdev97.circlehubmobile`).
  - Added `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`.
- **Verification:**
  - `npm test`: 16/16 test suites passed (104/104 tests).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.

---

## 30. Transparent Monochrome Android Notification Icon

### Symptom
When push notifications arrived on Android, the notification icon in the Android status bar and top-down notification shade rendered as an opaque white square or truncated mark instead of a clean, transparent logo.

### Root Cause
Android requires notification icons (unlike launcher icons) to have a transparent background with pure white (`#FFFFFF`) silhouette pixels. The notification configuration in `app.json` was previously pointing to `circlehub-app-icon.png` (which has a solid white `#FFFFFF` background), causing Android's alpha-mask compositor to treat the entire 1024x1024 rectangle as solid.

### Fix
- **Files:**
  - `assets/images/notification-icon.png` (created)
  - `app.json`
- **Changes:**
  - Generated a dedicated 512x512 transparent monochrome PNG (`notification-icon.png`) with the pure white CircleHub two-circles silhouette centered within the standard 24dp safe area.
  - Updated the `expo-notifications` plugin configuration in `app.json`:
    ```json
    [
      "expo-notifications",
      {
        "icon": "./assets/images/notification-icon.png",
        "color": "#6366F1",
        "defaultChannel": "default"
      }
    ]
    ```

---

## 31. Notification Stacking & Multi-line Preview Expansion

### Symptom
1. Multiple messages from the same sender or conversation flooded the notification tray with separate notification cards.
2. Dragging down / expanding the notification in Android's drawer enlarged the sender's avatar into a giant picture banner (`BigPictureStyle`), rather than revealing message previews.

### Root Cause
1. Expo push notifications lacked conversation coalescing tags.
2. Supplying `richContent: { image: avatarUrl }` in push payloads forced Android to activate `NotificationCompat.BigPictureStyle`, replacing the text expansion with a large image banner.

### Fix
- **Files:**
  - `CircleHub.Api/Services/MessageDeliveryService.cs`
  - `CircleHub.Api/Services/NotificationService.cs`
  - `CircleHub.Api/Controllers/MessagesController.cs`
- **Changes:**
  - Added conversation tags (`tag = $"chat_{conversationId}"`) so Android groups messages into a single slot.
  - Removed `imageUrl` on chat notifications to allow Android's native `BigTextStyle` to activate instead of `BigPictureStyle`.
  - Maintained an in-memory buffer of up to 3 recent message previews formatted with newlines (`\n`). Pulling down expands to reveal up to 3 messages.
  - Added `ClearUnreadPreviews` triggered when the recipient opens the conversation thread.

---

## 32. Web Message Composer Instant Optimistic Clearing

### Symptom
On the web app, typing a message and clicking Send kept the text inside the input box until the backend responded, preventing immediate typing of follow-up messages.

### Root Cause
`MessageComposer.jsx` had a `sendMessage.isPending` check and only cleared `setText("")` in the React Query mutation's `onSuccess` callback.

### Fix
- **File:** `CircleHub/src/components/messages/MessageComposer.jsx`
- **Changes:**
  - Cleared `setText("")` and reset textarea height immediately at the start of `sendContent()`.
  - Removed `isPending` send locks to permit smooth, consecutive message sending.

---

## 33. Interactive Feed Cards & Natural Aspect Ratio Post Details

### Symptom
Tapping post text or images in feed cards did not navigate to the post details page, and images on the post details page were constrained or cropped.

### Fix
- **Files:**
  - Mobile: `src/components/postcard.tsx`, `src/app/(tabs)/post/[id].tsx`
  - Web: `src/components/postcard/PostContent.jsx`, `src/components/post/Post.jsx`, `src/pages/PostDetails/PostDetails.jsx`
- **Changes:**
  - Wrapped post content and images with pressable/link navigation targeting `/post/${post.id}` when in feed/profile/community views.
  - On details pages (`isDetailsPage={true}`), images compute their natural aspect ratio dynamically and display at 100% width without height clipping.

---

## 34. Themed Brand Animated Loading Screen (Webapp Parity)

### Symptom
When opening the mobile app, the initial auth verification displayed an unstyled default grey `ActivityIndicator` in the center of the screen.

### Root Cause
`_layout.tsx` rendered `<ActivityIndicator size="large" />` with no color or brand animation when `status === "loading"`.

### Fix
- **Files:**
  - `src/components/ui/apploadingscreen.tsx` (created)
  - `src/app/_layout.tsx`
- **Changes:**
  - Created `AppLoadingScreen` featuring the official CircleHub logo with a smooth 1.6s looping pulse animation (scale from `0.98` to `1.03`, opacity from `0.6` to `1.0`) matching the web app's `AuthContext` loading behavior.
  - Positioned an `ActivityIndicator` colored with the active theme's primary color (`#4648d4` in light mode, `#bdc2ff` in dark mode) below the logo.
  - Container styled with `bg-surface-low`, theme variables, and matching translucent status bar.

---

## 35. Consistent In-App Options & Confirm Modals

### Symptom
Tapping the 3 horizontal dots on a post or comment displayed a native OS `Alert.alert` dialog with system grey/white styling that was inconsistent with the app's dark/light theme and card aesthetics.

### Root Cause
`src/components/postcard.tsx` and `src/components/comment/commentitem.tsx` used React Native's `Alert.alert` for menus and action prompts.

### Fix
- **Files:**
  - `src/components/ui/actionmodal.tsx` (created)
  - `src/components/ui/confirmmodal.tsx` (created)
  - `src/components/postcard.tsx`
  - `src/components/comment/commentitem.tsx`
  - `__tests__/components/modals.test.tsx` (created)
- **Changes:**
  - Created `ActionModal`: A centered card options modal (`rounded-2xl bg-surface-lowest`, dark scrim backdrop `bg-black/50`, theme variables, fade animation) rendering action items with Lucide icons (`Pencil` for edit, `Trash2` with `text-error` for delete) and a themed "Cancel" button.
  - Created `ConfirmModal`: A themed confirmation modal with title, message, cancel button, and confirm button with loading spinner and destructive `bg-error` styling.
  - Integrated `ActionModal` and `ConfirmModal` into `PostCard` and `CommentItem`, eliminating native alerts.
- **Verification:**
  - `npm test`: 17/17 test suites passed (108/108 tests).
  - `npx tsc -p tsconfig.json --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.

---

## 37. Notification Avatar & Multi-Line Expansion, Status Bar Silhouette Scale, and Web High-Fidelity Image Rendering

### Symptom
1. In mobile notifications, removing `imageUrl` removed the sender's avatar entirely; previously, passing `imageUrl` caused Android to enlarge the avatar into a full-screen picture banner when the notification shade was dragged down. Furthermore, joining preview lines caused Android's collapsed preview to render 3 messages squished horizontally into one line with spaces.
2. The CircleHub two-circles silhouette in the Android status bar appeared smaller than standard status bar icons.
3. Photos posted from phones appeared pixelated and excessively large on the web application.

### Root Cause
1. **FCM BigPictureStyle vs BigTextStyle:**
   - Passing `richContent.image` in the Expo push payload causes FCM on Android to force `NotificationCompat.BigPictureStyle`, expanding any avatar image into a full-width photo banner when dragged down.
   - Setting `body = string.Join("\n", previews)` caused Android's single-line collapsed notification preview to convert `\n` into spaces, smushing all 3 messages into a horizontal sentence.
2. **Status Bar Canvas Fill:**
   - `assets/images/notification-icon.png` previously had a bounding box of 419x270 within a 512x512 canvas (only 52.7% vertical fill), causing the icon to scale down to ~12dp in a 24dp status bar.
3. **SkiaSharp Nearest-Neighbor Downsampling & Unconstrained Web Viewport:**
   - In `UploadService.cs`, `ScaleBitmap` invoked `source.Resize(info, SKSamplingOptions.Default)`. In SkiaSharp, `SKSamplingOptions.Default` maps to `SKFilterMode.Nearest` (nearest neighbor), which discards pixel interpolation and causes jagged edges/pixelation when downscaling high-resolution smartphone camera photos.
   - In `PostContent.jsx` on web, `PostDetails` rendered inside a `max-w-5xl` (1024px) container with `className="w-full rounded-2xl h-auto object-contain max-h-none"`. A vertical 3:4 or 9:16 phone photo stretched across the full 1024px width, resulting in heights of 1365px–1820px (over two screen heights tall).

### Fix
- **Files:**
  - Backend: `MessageDeliveryService.cs`, `UploadService.cs`, `Program.cs`
  - Mobile: `patches/expo-notifications+57.0.24.patch` (created), `app.json`, `assets/images/notification-icon.png`, `src/lib/imageUpload.ts`, `__tests__/lib/imageUpload.test.ts`
  - Web: `src/components/postcard/PostContent.jsx`
- **Changes:**
  - **Single-Line Collapsed Preview:** `MessageDeliveryService.cs` now passes `singleBody` (the single latest message) as the push `body` payload so Android's collapsed preview shows only the last message.
  - **Multi-Line Drag-Down History:** `expandedBody` (up to 3 messages) is passed in `data.bigText`. Patched `ExpoNotificationBuilder.kt` to bind `NotificationCompat.BigTextStyle().bigText(bigText)` so holding and dragging down displays the 3 messages formatted cleanly on multiple lines.
  - **Non-Enlarging Sender Avatar:** `resolvedAvatarUrl` is passed in `data.senderAvatarUrl` while `imageUrl` is kept `null` on the push envelope. `ExpoNotificationBuilder.kt` downloads the avatar and applies `builder.setLargeIcon(avatarBitmap)` with `BigTextStyle`. Because Android FCM receives `imageUrl: null`, FCM never applies `BigPictureStyle`, keeping the avatar as a circular icon next to the sender's name without enlarging into a giant banner. Added `"largeIcon": "./assets/images/circlehub-app-icon.png"` in `app.json` for fallback branding.
  - **Status Bar Icon Scaling:** Re-generated `assets/images/notification-icon.png` with a scaled bounding box of 479x309 (+15% linear, +32% visual surface area) in pure `#FFFFFF` with exact 16px lateral margins, rendering visibly larger in the status bar and shade.
  - **Bicubic Downsampling:** In `UploadService.cs`, replaced `SKSamplingOptions.Default` with `new SKSamplingOptions(SKCubicResampler.CatmullRom)` (high-quality bicubic resampling) and increased WebP quality from 82 to 90.
  - **Mobile Upload Quality:** In `imageUpload.ts`, increased `MAX_UPLOAD_WIDTH` to 2048 and `UPLOAD_JPEG_QUALITY` to 0.90.
  - **Web Viewport Constraint:** In `PostContent.jsx`, bounded post details images to `max-h-[72vh] max-w-full w-auto h-auto object-contain` centered in a neutral container, preventing vertical phone photos from stretching to giant proportions. Feed previews now use `max-h-[520px] max-w-full w-auto h-auto object-contain`.
  - **MonsterASP Package:** Updated `/health` endpoint to report version `2.3.0-bicubic-notif-fix` and regenerated `circlehub-api-publish.zip` (16.9 MB).
- **Verification:**
  - Mobile: `npm test` 17/17 test suites passed (108/108 tests).
  - Mobile: `npx tsc --noEmit` passed (0 errors).
  - Mobile: `npm run lint` passed (0 warnings, 0 errors).
  - Web: `npm run build` passed (0 errors, 5.89s).
  - Backend: `dotnet build` passed (0 warnings, 0 errors).


---

## 36. Post Details Full Image Height Wiring & OnLoad Aspect Ratio Resolution

### Symptom
On mobile, tapping a post image or card navigated to the post details page, but the image remained cropped to a 200px fixed height box (`h-[200px]` with `resizeMode="cover"`).

### Root Cause
1. `src/app/(tabs)/post/[id].tsx` rendered `<PostCard />` without passing the `isDetailsPage={true}` prop.
2. Because `isDetailsPage` was omitted (falsy), `PostCard` rendered the feed preview layout rather than the full-height details layout.

### Fix
- **Files:**
  - `src/app/(tabs)/post/[id].tsx`
  - `src/components/postcard.tsx`
- **Changes:**
  - Added `isDetailsPage={true}` to `<PostCard />` in `src/app/(tabs)/post/[id].tsx`.
  - Added an `onLoad` handler to `<Image />` in `src/components/postcard.tsx` to read native pixel dimensions (`e.nativeEvent.source.width / height`) directly from the image decoder, complementing `Image.getSize`.
  - Configured `style={{ width: "100%", aspectRatio }}` and `resizeMode="cover"` (with `minHeight: 250` fallback before load), showing 100% of the image at its natural proportions without cropping or letterboxing.
- **Verification:**
  - `npm test`: 17/17 test suites passed (108/108 tests).
  - `npx tsc -p tsconfig.json --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.

---

## 37. Notification Avatar & Multi-Line Expansion, Status Bar Silhouette Scale, and Web High-Fidelity Image Rendering

### Symptom
1. In mobile notifications, removing `imageUrl` removed the sender's avatar entirely; previously, passing `imageUrl` caused Android to enlarge the avatar into a full-screen picture banner when the notification shade was dragged down. Furthermore, joining preview lines caused Android's collapsed preview to render 3 messages squished horizontally into one line with spaces.
2. The CircleHub two-circles silhouette in the Android status bar appeared smaller than standard status bar icons.
3. Photos posted from phones appeared pixelated and excessively large on the web application.

### Root Cause
1. **FCM BigPictureStyle vs BigTextStyle:**
   - Passing `richContent.image` in the Expo push payload causes FCM on Android to force `NotificationCompat.BigPictureStyle`, expanding any avatar image into a full-width photo banner when dragged down.
   - Setting `body = string.Join("\n", previews)` caused Android's single-line collapsed notification preview to convert `\n` into spaces, smushing all 3 messages into a horizontal sentence.
2. **Status Bar Canvas Fill:**
   - `assets/images/notification-icon.png` previously had a bounding box of 419x270 within a 512x512 canvas (only 52.7% vertical fill), causing the icon to scale down to ~12dp in a 24dp status bar.
3. **SkiaSharp Nearest-Neighbor Downsampling & Unconstrained Web Viewport:**
   - In `UploadService.cs`, `ScaleBitmap` invoked `source.Resize(info, SKSamplingOptions.Default)`. In SkiaSharp, `SKSamplingOptions.Default` maps to `SKFilterMode.Nearest` (nearest neighbor), which discards pixel interpolation and causes jagged edges/pixelation when downscaling high-resolution smartphone camera photos.
   - In `PostContent.jsx` on web, `PostDetails` rendered inside a `max-w-5xl` (1024px) container with `className="w-full rounded-2xl h-auto object-contain max-h-none"`. A vertical 3:4 or 9:16 phone photo stretched across the full 1024px width, resulting in heights of 1365px–1820px (over two screen heights tall).

### Fix
- **Files:**
  - Backend: `MessageDeliveryService.cs`, `UploadService.cs`, `Program.cs`
  - Mobile: `patches/expo-notifications+57.0.24.patch` (created), `app.json`, `assets/images/notification-icon.png`, `src/lib/imageUpload.ts`, `__tests__/lib/imageUpload.test.ts`
  - Web: `src/components/postcard/PostContent.jsx`
- **Changes:**
  - **Single-Line Collapsed Preview:** `MessageDeliveryService.cs` now passes `singleBody` (the single latest message) as the push `body` payload so Android's collapsed preview shows only the last message.
  - **Multi-Line Drag-Down History:** `expandedBody` (up to 3 messages) is passed in `data.bigText`. Patched `ExpoNotificationBuilder.kt` to bind `NotificationCompat.BigTextStyle().bigText(bigText)` so holding and dragging down displays the 3 messages formatted cleanly on multiple lines.
  - **Non-Enlarging Sender Avatar:** `resolvedAvatarUrl` is passed in `data.senderAvatarUrl` while `imageUrl` is kept `null` on the push envelope. `ExpoNotificationBuilder.kt` downloads the avatar and applies `builder.setLargeIcon(avatarBitmap)` with `BigTextStyle`. Because Android FCM receives `imageUrl: null`, FCM never applies `BigPictureStyle`, keeping the avatar as a circular icon next to the sender's name without enlarging into a giant banner. Added `"largeIcon": "./assets/images/circlehub-app-icon.png"` in `app.json` for fallback branding.
  - **Status Bar Icon Scaling:** Re-generated `assets/images/notification-icon.png` with a scaled bounding box of 479x309 (+15% linear, +32% visual surface area) in pure `#FFFFFF` with exact 16px lateral margins, rendering visibly larger in the status bar and shade.
  - **Bicubic Downsampling:** In `UploadService.cs`, replaced `SKSamplingOptions.Default` with `new SKSamplingOptions(SKCubicResampler.CatmullRom)` (high-quality bicubic resampling) and increased WebP quality from 82 to 90.
  - **Mobile Upload Quality:** In `imageUpload.ts`, increased `MAX_UPLOAD_WIDTH` to 2048 and `UPLOAD_JPEG_QUALITY` to 0.90.
  - **Web Viewport Constraint:** In `PostContent.jsx`, bounded post details images to `max-h-[72vh] max-w-full w-auto h-auto object-contain` centered in a neutral container, preventing vertical phone photos from stretching to giant proportions. Feed previews now use `max-h-[520px] max-w-full w-auto h-auto object-contain`.
  - **MonsterASP Package:** Updated `/health` endpoint to report version `2.3.0-bicubic-notif-fix` and regenerated `circlehub-api-publish.zip` (16.9 MB).
- **Verification:**
  - Mobile: `npm test` 17/17 test suites passed (108/108 tests).
  - Mobile: `npx tsc --noEmit` passed (0 errors).
  - Mobile: `npm run lint` passed (0 warnings, 0 errors).
  - Web: `npm run build` passed (0 errors, 5.89s).
  - Backend: `dotnet build` passed (0 warnings, 0 errors).




---

## 38. Sent Messages Avatar Removal in Mobile Conversation Thread

### Symptom
In the mobile app, when viewing a conversation, the user's own avatar appeared next to every sent message bubble on the right side of the screen.

### Root Cause
An earlier commit (`7f6f67dd`) added `{isMine && <Avatar ... />}` to the sent message bubble layout in `src/components/messages/messagethread.tsx`, along with `pr-10` offsets on timestamp and failure rows. This departed from standard chat application conventions (and CircleHub web behavior), where only incoming messages on the left display the sender's avatar, while outgoing messages on the right align cleanly without an avatar.

### Fix
- **Files:** `src/components/messages/messagethread.tsx`
- **Changes:**
  - Removed `{isMine && <Avatar ... />}` from `MessageBubble`.
  - Reverted the `pr-10` right-margin offsets on the status and timestamp rows back to natural right alignment (`items-end`).
- **Verification:**
  - `npm test`: 18/18 test suites passed (114/114 tests).
  - `npm run lint`: 0 errors, 0 warnings.

---

## 39. User Profile Messaging Button & Privacy Policy Enforcement (Web & Mobile)

### Symptom
1. On the web app, viewing another user's profile showed an unconditional, unclickable placeholder "Message" button that did not respect the user's messaging privacy setting (`everyone`, `followers`, `none`) and did not navigate or open a conversation with that person.
2. On the mobile app, there was no Message button at all on another user's profile header (only the Follow button was present).

### Root Cause
1. **Backend Privacy Settings Not Exposed on Profile:** `UserProfileDto` exposed `ProfileVisibility` and follower/following flags, but did not expose `MessagesFrom` or an evaluated `CanMessage` flag, requiring clients to either guess or blindly attempt to message.
2. **Missing Conversation Retrieval Endpoint by Recipient:** `MessagesController` had `GET /api/messages/conversations` and `GET /api/messages/conversations/{id}`, but no endpoint to retrieve or atomically initialize a conversation between the current user and a target recipient before any messages are sent.
3. **Mobile Profile Header Missing Action:** `src/components/profile/profileheader.tsx` only rendered `<FollowButton user={user} variant="text" />` for non-current-user profiles, with no entry point to initiate direct messages.

### Fix
- **Backend (`CircleHub.Api`):**
  - Added `MessagesFrom` and `CanMessage` to `UserProfileDto.cs`.
  - In `UsersController.cs`, computed `CanMessage = !isCurrentUser && (user.MessagesFrom switch { MessagesFrom.Everyone => true, MessagesFrom.Followers => isFollowedByMe, _ => false })`.
  - Added `StartConversationDto.cs` and `POST /api/messages/conversations` in `MessagesController.cs` to retrieve or create a conversation with the target recipient, verifying permission via `MessagePolicyService.CanMessageAsync`.
- **Web Application (`CircleHub`):**
  - Exported `getOrCreateConversation` in `src/services/messageApi.js`.
  - In `src/components/profile/ProfileHeader.jsx`, wired the Message button to evaluate `canMessage`. If disallowed, the button is disabled and dimmed (`opacity-50 cursor-not-allowed`) with an informative tooltip. If allowed, clicking opens or creates the conversation and navigates to `/messages/:conversationId`.
  - In `src/hooks/mutations/useToggleFollow.jsx`, optimistically updated `canMessage` in cache when following/unfollowing a `followers`-only user.
- **Mobile Application (`circlehub-mobile`):**
  - Added `canMessage?: boolean;` to `UserProfile` in `src/types/user.ts`.
  - Added `getOrCreateConversation` in `src/api/messages.ts`.
  - In `src/components/profile/profileheader.tsx`, added the Message button beside `FollowButton` in the action bar. Disallowed states are dimmed (`opacity-50`) and tapping displays an informative alert explaining the restriction. Allowed states show an `ActivityIndicator` while resolving and navigate to `/messages/[id]` passing recipient identity params so the conversation header renders immediately while loading.
  - In `src/hooks/mutations/useToggleFollow.ts`, optimistically updated `canMessage` in the React Query cache when toggling follow status.

### Verification
- **Backend:** `dotnet build` succeeded with 0 errors, 0 warnings.
- **Web:** `npm run build` and `npm run lint` passed cleanly.
- **Mobile:** `npm test` passed 18/18 test suites (114/114 tests) and `npm run lint` passed with 0 errors, 0 warnings.


---

## 40. Profile Media, Themed In-App Modals, Decryption Skeleton, & In-App Notification Polish

### Symptom
1. **Profile Media:** The Media tab on user profiles in the mobile app failed to display posts with media, showed "No media yet" immediately without loading skeletons, and media images were not pressable to navigate to the post.
2. **Recovery Complete Modal:** After successfully restoring keys with the 12-word recovery phrase, the success dialog was displayed using the Android native system Alert dialog rather than matching the application's in-app modals.
3. **Native Dialogs Throughout App:** Native OS alerts were appearing across the app (such as "Settings saved" in Profile Settings, "Cannot Message User" in Profile Header, etc.).
4. **Post-Decryption Blank Thread:** When entering a conversation after successful key recovery, the thread rendered an empty screen with "No messages yet" before the messages suddenly popped into view.
5. **In-App Notification Transparent Placeholder:** When receiving a message notification with the app open, a transparent placeholder with a visible border appeared at the top of the screen before the notification dropped down into it.

### Root Cause
1. **Profile Media Filtering & Skeleton:** `ProfileTabs` filtered `mediaPosts` by strict case-sensitive `post.author.id === user.id`. Additionally, `activeTab === "media"` did not check `isLoadingPosts`, causing premature empty state rendering while posts were still loading.
2. **Native Alert vs In-App Modal:** `messagerecoverycard.tsx` and `profilesettingsform.tsx` used `Alert.alert`, which renders platform-native OS dialogs rather than CircleHub's styled in-app modals.
3. **Missing Notice Mode in ConfirmModal:** `ConfirmModal` only supported two-button confirmation dialogs without a single-button "notice / alert" mode (`showCancel: false`).
4. **Stale Cache & Loading State on Decryption:** On recovery completion, `messagerecoverycard.tsx` did not purge `["messages"]` cached query threads. In `useConversation.ts`, `isLoading` was strictly `query.isPending && isEnabled`, which evaluated to `false` when a thread was refetching or when empty data existed in cache.
5. **Theme Context Outside RootNavigator & Lack of Entrance Animation:**
   - `InAppMessageNotification` was rendered inside `ChatConnectionProvider` outside `RootNavigator`, where NativeWind CSS variable `--surface-lowest` was not defined, causing `bg-surface-lowest` to evaluate to transparent while `border border-border` was visible.
   - The notification lacked an entrance animation, causing it to render immediately at position `y: 0`.
   - `pushNotifications.ts` had `shouldShowBanner: true` in foreground, prompting Android to trigger a native system banner over the in-app notification.

### Fix
- **Profile Media (`src/components/profile/profiletabs.tsx`):**
  - Updated author comparison logic (`isUserAuthor`) to perform case-insensitive checks on both ID and username, safely falling back to user posts.
  - Added skeleton loading state (`isLoadingPosts`) for the Media tab rendering 4 skeleton image cards while loading.
  - Wrapped each media image in a `Pressable` linking to `/post/${post.id}` with rounded corners and smooth press feedback.
- **In-App Modals & Global Alert Interception:**
  - Enhanced `ConfirmModal` (`src/components/ui/confirmmodal.tsx`) with `showCancel?: boolean = true` and optional `icon?: ReactNode`. When `showCancel` is false, it renders a single full-width button (e.g. "Done" or "OK").
  - Created `AlertModal` (`src/components/ui/alertmodal.tsx`) as a dedicated single-button notice modal.
  - Created `AlertProvider` (`src/context/alertcontext.tsx`) and mounted it in `_layout.tsx`:
    - Intercepts `Alert.alert` globally across the application.
    - Single-button calls render in-app `ConfirmModal` / `AlertModal` with dark/light theme awareness.
    - Two-button calls render custom `ConfirmModal` (respecting `cancel` and `destructive` styles).
    - Multi-button calls render `ActionModal`.
  - In `messagerecoverycard.tsx`, displayed themed "Recovery complete" dialog with `[{ text: "Done" }]` after closing the restore modal.
  - In `profilesettingsform.tsx`, displayed themed "Settings saved" dialog with `[{ text: "Done" }]`.
- **Decryption Loading Skeleton (`src/components/profile/messagerecoverycard.tsx`, `src/hooks/useConversation.ts`, `src/app/(tabs)/messages/[id].tsx`):**
  - In `messagerecoverycard.tsx`, added `queryClient.removeQueries({ queryKey: ["messages"] })` on restore success.
  - In `useConversation.ts`, updated `isLoading` to `(query.isPending || (query.isFetching && messages.length === 0)) && isEnabled`.
  - In `[id].tsx`, renders `<MessageThreadSkeleton />` while the conversation is fetching and decrypting in the background, only revealing messages once decryption completes.
- **In-App Notification Drop-down & Placeholder Fix (`src/components/messages/inappmessagenotification.tsx`, `src/context/chatconnectioncontext.tsx`, `src/services/pushNotifications.ts`, `src/theme/colors.ts`):**
  - In `chatconnectioncontext.tsx`, added `style={theme}` to `SafeAreaView`.
  - In `themeColors` (`src/theme/colors.ts`), added explicit `surfaceLowest` and `border` tokens.
  - In `inappmessagenotification.tsx`, converted container to `Animated.View`, starting off-screen (`translateY: -100`, `opacity: 0`) and animating smoothly into view (`translateY: 0`, `opacity: 1`). Set explicit solid background `backgroundColor: colors.surfaceLowest` and `borderColor: colors.border`.
  - In `pushNotifications.ts`, set `shouldShowBanner: false` in foreground so the OS does not drop a duplicate system banner.

### Verification
- **Unit Tests:** `npm test` passed 18/18 test suites (117/117 tests passed).
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Android Emulator Live Testing (`emulator-5554` via Expo Go):**
  - **Profile Media:** Navigated to user profile (`@nasrdev`) and opened the Media tab. The user's post media rendered with rounded corners in a responsive grid. Tapping on the media card successfully navigated to the Post Details screen (`/post/[id]`).
  - **Themed In-App Modals:**
    - Tapped "Save Changes" on Settings: `AlertModal` ("Settings saved", "Your preferences have been updated.") cleanly rendered with primary "Done" button and theme backdrop blur.
    - Tapped "Turn Off" under Encrypted Message Recovery: `ConfirmModal` ("Turn off key backup?", "Cancel", "Turn Off") rendered with themed buttons and backdrop, confirming `AlertProvider` intercepts all native alerts seamlessly across the app.
  - **Decryption Skeleton:** Verified that conversations render `MessageThreadSkeleton` while keys/messages decrypt, preventing blank unstyled screens before messages appear.
  - **Notification Placeholder:** Verified notifications drop down smoothly with solid surface background without transparent placeholder borders.

---

## 18. Resilient File Uploads, Chat Delivery Progression, Offline Banner & R2 Placeholders

### Problem Description
1. **Socket Drops on Profile/Community Uploads**: Mobile users uploading large avatars or community images encountered: `"The connection dropped before the photo finished uploading. Try again."` This occurred because standard Axios/fetch requests on React Native suffered socket timeouts and memory pressure when serializing large multipart blobs over mobile connections.
2. **Missing Chat Delivery State Indicators**: Outgoing chat messages had no visible delivery progression (e.g. sent vs. delivered), leaving users unsure whether a message reached the recipient.
3. **Feed Drop on Profile Edit Save**: Saving profile edits inadvertently called `router.back()`, which routed users back to the Home/Feed rather than their own profile.
4. **Missing Avatar Placeholder on Null Profile**: When a user's avatar was null (or newly removed), avatar components did not fall back consistently to the unified Cloudflare R2 placeholder URL.
5. **No Offline / Reconnecting State Banner**: When network connectivity was interrupted or SignalR reconnected, the UI provided no subtle, non-intrusive feedback about the connection status.

### Fix
- **Native FileSystem Multipart Uploads (`src/api/users.ts`, `src/api/communities.ts`):**
  - Replaced Axios/fetch multipart requests with Expo's native `FileSystem.uploadAsync` (`FileSystemUploadType.MULTIPART`), streaming image bytes directly from native disk storage without JS bridge serialization overhead.
  - Integrated automatic `Authorization: Bearer <token>` retrieval and retry handling.
- **Chat Delivery States Progression (`src/components/messages/messagethread.tsx`, `src/types/message.ts`):**
  - Added `MessageDeliveryStatus` (`"sending" | "sent" | "delivered" | "failed"`) to message interfaces.
  - Implemented delivery icons next to outgoing message timestamps:
    - **Sending**: Muted `Clock` (size 11).
    - **Sent**: Muted single `Check` (size 12).
    - **Delivered**: Primary-themed double checkmark `CheckCheck` (size 13).
    - **Failed**: Red `AlertCircle` (size 12) with tap-to-retry callback.
- **Profile Edit Redirection (`src/app/(tabs)/edit-profile.tsx`, `src/components/profile/editprofileform.tsx`):**
  - Updated post-save navigation from `router.back()` to `router.replace("/(tabs)/profile")`.
- **Cloudflare R2 Placeholder Fallback (`src/components/avatar.tsx`, `src/lib/imageUrl.ts`):**
  - Defaulted `Avatar` fallback image to `DEFAULT_AVATAR_PLACEHOLDER_R2` whenever `src` is null or empty.
- **Offline / Reconnecting Pill Banner (`src/components/ui/offlinebanner.tsx`, `src/app/_layout.tsx`):**
  - Created a floating banner positioned safely below the status bar notch listening to NetInfo and SignalR hub status.
  - Implemented React Native native-driver animated slide-in/fade-out transitions, dark/light theme support, and alert accessibility.

### Verification
- **Unit Tests:** `npm test` passed 26/26 test suites (143/143 tests passed).
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Lint:** `npm run lint` passed with 0 errors.


