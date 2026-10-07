---
name: modal-stack-setup
description: >-
  Installs and wires @slavayakimov/react-native-modal-stack into a React Native or Expo app —
  peer dependencies, root providers, configureModals with a sheet shell, kit theme and the
  React Navigation adapter. Use when adding the modal stack library to a project, configuring
  the shell or theme, or debugging "No Shell configured" / sheets that never appear.
  Triggers: install modal stack, set up bottom sheet modals, configureModals, KitSheetShell,
  установить модалки, подключить библиотеку модалок, настроить шторки.
license: MIT
metadata:
  version: 0.1.0
---

# Modal stack setup

## 1. Install

```bash
npm i @slavayakimov/react-native-modal-stack
# not on npm yet → install from GitHub
npm i github:SlavaYakimov/reactNativeModal

# peers for the sheet UI (Expo picks matching versions)
npx expo install react-native-gesture-handler react-native-reanimated react-native-safe-area-context
# optional: screen-aware portals
npx expo install @react-navigation/native
```

Peers are optional per layer: `core` and `react` need only React; `react-native` and `kit` need gesture-handler, reanimated and safe-area; `navigation` needs `@react-navigation/native`.
Reanimated 3 and 4 both work. On Reanimated 4 also install `react-native-worklets` and keep its Babel plugin as the Reanimated docs say.

## 2. Configure once at module init

```tsx
import { configureModals } from "@slavayakimov/react-native-modal-stack/react";
import { KitSheetShell } from "@slavayakimov/react-native-modal-stack/kit";
import { reactNavigationScreen } from "@slavayakimov/react-native-modal-stack/navigation";

configureModals({
    Shell: KitSheetShell,
    screen: reactNavigationScreen, // omit without React Navigation
    translate: (key) => i18n.t(key), // omit when titles are plain strings
});
```

Call it before the first `Portal` renders (top of `App.tsx` or a `setup.ts` imported first). Without a `Shell`, a Portal logs `[modal-stack] No Shell configured` once and renders nothing.

## 3. Root providers

```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
        <ModalKitProvider theme={{ colors: { accent: "#7C5CFF" } }}>
            <NavigationContainer>{/* screens */}</NavigationContainer>
        </ModalKitProvider>
    </SafeAreaProvider>
</GestureHandlerRootView>
```

`ModalKitProvider` is needed only for kit sheets and `KitSheetShell`; nested providers merge over the parent theme (use it for a dark subtree).

## 4. Custom shell (own design system)

Use `createSheetShell` from `/react-native` instead of `KitSheetShell`:

```tsx
export const AppSheetShell = createSheetShell({
    BackButton: AppBackButton, // receives { onPress, accessibilityLabel, tintColor }
    TitleComponent: AppTitle, // receives { children: string }
    backAccessibilityLabel: () => i18n.t("back"),
    appearance: { sheetColor: "#fff", cornerRadius: 24 },
    useAppearance: () => useAppColors(), // hook, called inside the shell
});
```

`createKitSheetShell(options)` does the same but takes colours from the kit theme.

## 5. Scoped overrides

- `ModalProvider` with its own `controller`, `Shell` or `translate` isolates a subtree (tests, storybook, a flow with its own stack).
- `createModalRegistry(ns, { Shell })` overrides the shell for one registry.

## Verify

1. Open a step from a button → sheet animates in; backdrop tap closes it.
2. `push` a second step → back arrow appears; Back pops; swipe pops one step at a time.
3. Navigate away with a sheet open (with the navigation adapter) → the sheet closes.
4. Jest: mock reanimated (`react-native-reanimated/mock`) and safe-area, and add `react-native-gesture-handler/jestSetup` to `setupFiles`.
