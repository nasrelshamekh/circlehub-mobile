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
