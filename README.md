# CircleHub Mobile

> Join hubs, post updates, and follow people — the CircleHub community network, on mobile.

The cross-platform React Native / Expo mobile client for CircleHub — a full-featured social networking platform where users post updates, share photos, join curated communities, and chat in real-time with end-to-end encryption. Built with [Expo Router](https://docs.expo.dev/router/introduction), [NativeWind](https://www.nativewind.dev), [TanStack Query](https://tanstack.com/query/latest), and [@microsoft/signalr](https://www.npmjs.com/package/@microsoft/signalr).

---

## Features

- **Accounts & Auth** — register/login with username or email, JWT session storage in `expo-secure-store`, email verification, forgot/reset password, and binary gender selection (Male / Female).
- **Feed & Live Sync** — home feed with pull-to-refresh, infinite scroll pagination, and real-time post creation broadcasts. Scrolled-down users receive an animated floating `↑ X New Posts` pill indicator that smoothly scrolls to top and prepends new posts.
- **End-to-End Encrypted (E2EE) Chat** — real-time 1-on-1 direct messaging via SignalR. ECDH P-256 + AES-GCM-256 encryption (`ENC:v1:` envelopes) with client-side cryptography.
- **12-Word Key Backup & Recovery** — BIP39 English mnemonic passphrase backup (PBKDF2-HMAC-SHA256) so user chat history seamlessly follows them across devices while preserving zero-knowledge security.
- **Live Presence & Typing Indicators** — real-time online/offline indicators with relative last-seen formatting and active typing broadcast dots in conversation lists and thread headers.
- **Push & In-App Notifications** — background push notifications via Expo Push Service (`DeviceToken` registration) and interactive in-app notification toasts with audio chimes. Notifications are automatically suppressed when viewing the active conversation thread or when the app is in the foreground.
- **Communities & Hubs** — public and private communities, member lists, join request management (accept/reject), role badges (Admin / Moderator / Member), and community-specific feeds.
- **Profiles & Settings** — avatar and cover uploads via `expo-image-picker`, bio, skills, location, job title, follower/following lists, and password change.
- **Performance & Asset Caching** — high-performance image rendering powered by `expo-image` with `memory-disk` cache policy and fade-in transitions.
- **Signature Gradient Design & Theming** — brand 135° gradient action buttons (`GradientButton`), dark and light modes, and persistent theme preferences saved to secure storage across cold starts.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | React Native (0.86) · React 19 · Expo SDK 57 · Expo Router v5 (file-based navigation) |
| **Styling & Icons** | NativeWind (Tailwind CSS v4) · `lucide-react-native` · `expo-linear-gradient` |
| **State & Networking** | TanStack Query v5 · `@microsoft/signalr` · `@react-native-community/netinfo` |
| **Security & Storage** | `expo-secure-store` · `@noble/curves` (P-256) · `@noble/ciphers` (AES-GCM) · `@noble/hashes` |
| **Media & Native APIs**| `expo-image` · `expo-image-picker` · `expo-image-manipulator` · `expo-notifications` · `expo-clipboard` |
| **Testing** | Jest · `jest-expo` · React Native Testing Library |

---

## Repository Layout

```
circlehub-mobile/
├── assets/                  # App icons, splash screens, notification icons
├── src/
│   ├── api/                 # Typed API clients (auth, posts, communities, users, keys, search)
│   ├── app/                 # Expo Router route hierarchy
│   │   ├── (auth)/          # Auth routes (login, register, forgot/reset password, verify email)
│   │   ├── (tabs)/          # Bottom tabs (Home, Explore, Create, Followers, Profile)
│   │   │   ├── community/   # Community details & manage screens
│   │   │   ├── messages/    # Conversation list, live chat threads, recipient search
│   │   │   ├── post/        # Post detail view & comments
│   │   │   └── profile/     # Public & self profile screens
│   │   ├── compose.tsx      # Post composition modal
│   │   └── _layout.tsx      # Root provider tree (Theme, Auth, SignalR Chat, QueryClient)
│   ├── components/          # Feature components (feed, messages, community-detail, ui, skeletons)
│   ├── context/             # React Context providers (AuthContext, ThemeContext, ChatConnectionContext)
│   ├── hooks/               # Custom hooks and React Query mutations
│   ├── lib/                 # Utilities (imageUpload, feedEvents, formatPostDate, session, queryKeys)
│   ├── services/            # Background services (SignalR chatHub, messageCrypto, keyRecovery, pushNotifications)
│   ├── theme/               # Design tokens, semantic colors (light & dark), themes
│   └── types/               # TypeScript definitions
├── test/                    # Jest setup and global mock configurations
├── __tests__/               # Unit, crypto, hook, and component tests
├── android/                 # Native Android project configuration & Gradle wrapper
├── app.json                 # Expo project configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Expo Go app or an Android/iOS emulator (Android Studio / Xcode)
- A running instance of the [CircleHub API](https://github.com/nasrelshamekh/CircleHub) (locally or remote)

### Setup

```bash
# Clone the repository
git clone https://github.com/nasrelshamekh/circlehub-mobile.git
cd circlehub-mobile

# Install dependencies
npm install

# Configure API endpoint (create .env)
# Local development against local backend:
echo "EXPO_PUBLIC_API_URL=http://10.0.2.2:5289" > .env
# Or point to the live backend:
# echo "EXPO_PUBLIC_API_URL=https://circlehub.runasp.net" > .env

# Start the Expo development server
npm start
```

### Building the Android Release APK

```powershell
# Set Java and Android SDK environment variables
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr" # Or your local JDK 17-21
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

# Run Gradle release build
cd android
.\gradlew.bat assembleRelease

# Output APK is located at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the interactive Expo dev server |
| `npm run android` | Launch app on connected Android emulator or device |
| `npm run ios` | Launch app on iOS simulator |
| `npx tsc --noEmit` | Run TypeScript type checks across the codebase |
| `npm run lint` | Run Expo ESLint checks |
| `npm test` | Run the complete Jest test suite (20 test suites, 120 tests) |
| `npm run test:watch` | Run Jest in interactive watch mode |

---

## Release History

### v1.1.0 (Current Release)
- **Real-Time E2EE Messaging**: Full SignalR WebSocket client with client-side ECDH P-256 + AES-GCM encryption and 12-word BIP39 key backup/restore.
- **Live Feed Sync & Indicator**: Real-time post creation event handling with floating `↑ X New Posts` pill indicator that drops in when scrolled down.
- **Expo Push & In-App Notification System**: Foreground notification suppression, active conversation mute, and instant in-app notification toasts.
- **135° Gradient Button Alignment**: Upgraded all primary call-to-action buttons across the app to use `GradientButton` matching the web app design language.
- **`expo-image` Integration**: High-performance cached image rendering with memory/disk caching across avatars, post media, and community covers.
- **Persistent Theme Preferences**: Saved manual dark/light theme selection to `SecureStore` across app restarts.
- **Binary Gender Selection**: Cleaned registration and edit profile forms to strictly accept Male and Female.

### v1.0.0
- Initial mobile release: Tab navigation, authentication, user profiles, feed browsing, community exploration, and posting.

---

## Upcoming (v1.2.0 — Package 1: Social Reach & Discovery)

The upcoming **v1.2.0** release focuses on social sharing, content interactivity, and post collection:

1. **Universal Sharing & "Copy Link to Post"**:
   - Native OS share sheet integration (`Share.share`) to share CircleHub posts directly to WhatsApp, Telegram, Twitter/X, Messages, and other apps.
   - One-click "Copy Link" with instant visual confirmation toast.
   - Universal post options menu (`...`) accessible to all viewers, not just post authors.
2. **Rich Interactive Text (Links, `@mentions` & `#hashtags`)**:
   - Auto-parsing URLs into clickable links.
   - Auto-linking `@username` mentions to open the mentioned user's profile.
   - Auto-linking `#hashtags` to filter posts across Explore.
3. **Post Bookmarks / Saved Posts**:
   - Save posts to a private personal "Saved" tab on the user's profile for quick access.
