# CircleHub Mobile

The Expo client for CircleHub — a community network where people join hubs, post updates,
and follow each other. Built with [Expo Router](https://docs.expo.dev/router/introduction)
and [NativeWind](https://www.nativewind.dev).

## Getting started

```bash
npm install
npx expo start
```

Then open the app in a development build, an Android/iOS emulator, or Expo Go.

The app talks to the CircleHub API. Point it at your backend with an environment variable
(defaults to a LAN address for local development):

```bash
# .env
EXPO_PUBLIC_API_URL=http://192.168.1.2:5289
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start on a specific platform |
| `npx tsc --noEmit` | Typecheck |
| `npm run lint` | Lint (`expo lint`) |
| `npm test` | Run the Jest test suite |
| `npm run test:watch` | Jest in watch mode |

Run typecheck, lint, and tests before considering a change done.

## Project structure

```
src/
  app/          Expo Router routes (file-based navigation)
  api/          Typed API clients and endpoint helpers
  components/   Reusable UI, grouped by feature (auth, community-detail, explore, ...)
  context/      React context providers (auth, theme)
  hooks/        React Query hooks and feature hooks
  lib/          Framework-free helpers (validation, uploads, image URLs)
  theme/        Design tokens (colors)
  types/        Shared API and domain types
test/           Jest setup and shared test helpers
__tests__/      Unit and hook tests
```

Routes live in `src/app` and stay thin: screens compose components from `src/components` and
read data through hooks in `src/hooks`. Keep non-route code out of `src/app`.

## Conventions

- **Styling**: NativeWind `className` everywhere. Fall back to inline `style` only for values
  that cannot be a class (dynamic opacity, computed dimensions, theme color objects).
- **Theme**: read colors from `src/theme/colors.ts` via `useTheme()`; UI surfaces use the
  `bg-surface-*` / `text-text-*` / `border-border` utility classes.
- **Primary actions**: use `GradientButton` (`src/components/ui/gradientbutton.tsx`) so every
  call to action shares the landing-page gradient.
- **Comments**: explain intent and gotchas only — the code says what, comments say why.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
