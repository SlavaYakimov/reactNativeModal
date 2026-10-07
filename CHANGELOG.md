# Changelog

## 0.1.0

First standalone release.

- `core`: `ModalController` — a framework-free stack with `push`, `replace`, `pop`, `close`, `dismiss`, `openAfterClose`, `removeWhere` and `cancelPending(owner)`.
- `react`: `createModalRegistry` with typed payloads, `ModalProvider` / `configureModals`, `useModalDraft`, `toggleDraftId`, dismiss interception.
- `react-native`: `createSheetShell` with themable `appearance` / `useAppearance`, `FitBox` / `ContentBox` / `BareBox`, `FooterContent`, `KeyboardGeometryStore`.
- `navigation`: `reactNavigationScreen` adapter.
- `kit`: `KitSheetShell`, `ModalKitProvider` theme, `ActionMenuSheet`, `ConfirmSheet`, `OptionListSheet`, `CheckboxListSheet`.
- Cursor plugin with an authoring rule and the `modal-stack-setup`, `modal-stack-authoring` and `modal-keyboard-footer` skills.
- Expo example app.
