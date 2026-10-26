# CircleHub Mobile

The official mobile app for **CircleHub** — built with **React Native 0.86**, **Expo SDK 57**, **NativeWind (Tailwind CSS v3)**, and **TypeScript**.

CircleHub Mobile brings the complete CircleHub community experience to iOS and Android, featuring real-time end-to-end encrypted messaging, interactive multimedia feeds, community exploration, and rich profile controls.

---

## Features

- **Authentication & Security**: Account registration with binary gender selection, secure login, email verification, password recovery, and encrypted token storage (`expo-secure-store`).
- **Interactive Feed & Reactions**: Real-time chronological post feed with live post sync, animated like toggles, threaded comments, and universal post options.
- **Social Reach & Interactivity**: Rich text auto-linking (@mentions, #hashtags, URLs), native OS share sheets (`Share.share`), one-click "Copy link" (`expo-clipboard`), and private bookmarks.
- **Topic-Based Communities**: Discover, join, manage, and interact within public and private communities.
- **End-to-End Encrypted Messaging (E2EE)**: 1-on-1 real-time chats with SignalR WebSockets, Noble ECDH P-256 + AES-GCM encryption, live typing indicators, and 12-word BIP39 mnemonic recovery.
- **Notifications**: Expo Push Notifications with foreground suppression, unread badges, and in-app banner toasts.
- **Customizable Profiles**: Profile photo and cover photo uploads, tabbed views (Posts, Media, Liked, Saved, About), and profile privacy controls.
- **Theme Support**: Adaptive and manual light/dark themes with persistent device storage.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [React Native 0.86](https://reactnative.dev/) + [Expo SDK 57](https://expo.dev/) (Managed Workflow) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Styling** | [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS v3 engine) |
| **Icons & UI** | [Lucide React Native](https://lucide.dev/), [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/), [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) |
| **State & Data Fetching** | [TanStack React Query v5](https://tanstack.com/query) |
| **Real-Time** | [@microsoft/signalr](https://www.npmjs.com/package/@microsoft/signalr) |
| **Cryptography** | [@noble/curves](https://github.com/paulmillr/noble-curves) (P-256) + [@noble/ciphers](https://github.com/paulmillr/noble-ciphers) (AES-GCM) |
| **Storage** | [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) |
| **Testing** | [Jest](https://jestjs.io/) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) |

---

## Repository Layout

```
circlehub-mobile/
├── assets/                  # Icons, splash images, and app branding
├── src/
│   ├── app/                 # Expo Router route hierarchy
│   │   ├── (auth)/          # Authentication flow (login, register, forgot-password)
│   │   ├── (tabs)/          # Main tab navigator (feed, explore, messages, communities, profile)
│   │   └── _layout.tsx      # Root application layout and providers
│   ├── components/          # Reusable UI components
│   │   ├── auth/            # Auth screens, forms, and gender selection
│   │   ├── common/          # RichText tokenizer and common widgets
│   │   ├── community-detail/# Community headers, tabs, and management
│   │   ├── explore/         # Search bars, tabs, and result cards
│   │   ├── messages/        # Message threads, composer, and encryption recovery
│   │   ├── profile/         # Profile header, tabs, and settings
│   │   └── ui/              # ActionModal, AlertModal, ConfirmModal, GradientButton
│   ├── context/             # AuthContext, ThemeContext, ChatConnectionContext
│   ├── hooks/               # TanStack Query custom hooks and bookmarks
│   ├── lib/                 # Utilities, date formatters, and image manipulation
│   ├── services/            # SignalR client, message crypto, push notification handler
│   ├── theme/               # Colors and design tokens
│   └── types/               # TypeScript interfaces and API schemas
├── test/                    # Jest configuration and global mock setup
├── __tests__/               # Unit and integration test suites
├── app.json                 # Expo project configuration
└── package.json             # Dependencies and scripts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Android Studio / Android SDK (for Android emulator or physical device testing)
- Xcode (macOS only, for iOS simulator testing)
- [Expo Go](https://expo.dev/go) or custom development build on a physical device

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/circlehub-mobile.git
cd circlehub-mobile

# Install dependencies
npm install

# Start the Expo development server
npm run start
```

### Environment Configuration

Configure the backend API URL in `src/services/apiClient.ts`:

```typescript
const BASE_URL = "https://circlehub.runasp.net";
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the Expo development bundler |
| `npm run android` | Launch app on connected Android emulator or device |
| `npm run ios` | Launch app on iOS simulator |
| `npx tsc --noEmit` | Run TypeScript type checks across the codebase |
| `npm run lint` | Run Expo ESLint checks |
| `npm test` | Run the complete Jest test suite (21 test suites, 123 tests) |
| `npm run test:watch` | Run Jest in interactive watch mode |

---

## Release History

### v1.2.0 (Current Release)
- **Universal Sharing & "Copy Link to Post"**:
  - Universal post options menu (`...`) accessible to all viewers on every post.
  - One-click "Copy link" action (`expo-clipboard`) copying the canonical web URL.
  - Native OS share sheet (`Share.share`) allowing instant sharing to WhatsApp, Telegram, Messages, and external platforms.
- **Rich Interactive Text (`RichText`)**:
  - Auto-parsing URLs (`https?://...`) into clickable external web links (`Linking.openURL`).
  - Auto-detecting `@username` mentions navigating directly to user profiles (`/profile/[username]`).
  - Auto-detecting `#hashtags` linking to the Explore search view (`/(tabs)/explore?q=#tag`).
  - Integrated into main post cards, explore cards, and comment threads.
- **Post Bookmarks / Saved Posts**:
  - Per-account local persistence via `expo-secure-store` with synchronized in-memory caching (`useBookmarks`).
  - Interactive Bookmark toggle button on post action bars with optimistic selection.
  - Dedicated "Saved" tab on self-profile displaying all bookmarked posts with empty state handling.

### v1.1.0
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

## Upcoming (v1.3.0 — Package 2: Media & Community Experience)

The upcoming **v1.3.0** release will focus on rich media and community engagement:

1. **Full-Screen Media Lightbox**: Pinch-to-zoom, high-res previews, and swipe-to-dismiss for post images.
2. **Community Polls & Rich Post Types**: Interactive community polls and multi-image galleries.
3. **Enhanced Search Filters**: Categorical search facets and advanced discovery tools.
