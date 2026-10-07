# @slavayakimov/react-native-modal-stack

Stacked bottom-sheet modals for React Native and Expo.

- **Stack, not a single modal.** `push` a nested step, the back arrow pops it, swipe or backdrop dismisses one step at a time.
- **Typed registry.** Each feature declares its steps once; `open("key", payload)` does not compile without the payload the step needs.
- **Keyboard-aware sheet.** Content-sized sheets grow above the keyboard through `FooterContent`; form sheets lift themselves. One keyboard listener for the whole app.
- **Ready-made bodies.** Action menu, confirm, single and multi choice lists with a theme — or plug in your own design system.
- **Cursor plugin.** An authoring rule and skills that teach the agent how to set up and write modals with this library.

Русская версия — [ниже](#по-русски).

## Install

```bash
npm i @slavayakimov/react-native-modal-stack
# until the package is published to npm:
npm i github:SlavaYakimov/reactNativeModal
```

Peer dependencies, needed only by the layers you import:

| Layer | Needs |
|---|---|
| `/core`, `/react` | `react` |
| `/react-native`, `/kit` | `react-native`, `react-native-gesture-handler`, `react-native-reanimated` (3 or 4), `react-native-safe-area-context` |
| `/navigation` | `@react-navigation/native` |

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-safe-area-context
```

## Quick start

```tsx
// App.tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureModals } from "@slavayakimov/react-native-modal-stack/react";
import { KitSheetShell, ModalKitProvider } from "@slavayakimov/react-native-modal-stack/kit";

configureModals({ Shell: KitSheetShell });

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ModalKitProvider theme={{ colors: { accent: "#7C5CFF" } }}>
                    <TasksScreen />
                </ModalKitProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
```

```tsx
// TaskModals.tsx
import { createModalRegistry } from "@slavayakimov/react-native-modal-stack/react";
import { ActionMenuSheet, ConfirmSheet } from "@slavayakimov/react-native-modal-stack/kit";

type Ctx = { onDelete: (id: string) => void; isDeleting: boolean };
type Target = { id: string };

const m = createModalRegistry<Ctx>("tasks");

export const TaskModals = m.build({
    actions: m.def<Target>({
        layout: "fit",
        render: ({ payload }) => <Actions target={payload} />,
    }),
    deleteConfirm: m.def<Target>({
        layout: "fit",
        title: "Delete task?",
        render: ({ ctx, payload, nav }) => (
            <ConfirmSheet
                destructive
                confirmLabel="Delete"
                isLoading={ctx.isDeleting}
                onCancel={nav.canGoBack ? nav.back : nav.close}
                onConfirm={() => ctx.onDelete(payload.id)}
            />
        ),
    }),
});

function Actions({ target }: { target: Target }) {
    const { push } = TaskModals.useModal();
    return (
        <ActionMenuSheet
            items={[{ key: "delete", label: "Delete", destructive: true, onPress: () => push("deleteConfirm", target) }]}
        />
    );
}
```

```tsx
// TasksScreen.tsx
const { open, close } = TaskModals.useModal();

<FlatList data={tasks} renderItem={({ item }) => <Row onPress={() => open("actions", { id: item.id })} />} />
<TaskModals.Portal onDelete={(id) => remove(id, { onSuccess: close })} isDeleting={isPending} />
```

The screen owns long-lived data and passes it to `Portal` (`ctx`); the step's target travels as `payload`.

## API by subpath

### `/core`

`ModalController` — a framework-free stack. `push(request)`, `replace(request)`, `pop()`, `close()`, `dismiss()` (pop at depth > 1, close otherwise), `openAfterClose(request)` (waits for the closing sheet to unmount), `removeWhere(predicate)`, `cancelPending(owner)`, `subscribe` / `getSnapshot` for `useSyncExternalStore`.

### `/react`

| Export | Purpose |
|---|---|
| `createModalRegistry<Ctx>(namespace, { Shell? })` | `.def<P>({ layout, title, render })`, `.build(defs)` → `{ Portal, useModal, request, owns, keys }` |
| `useModal()` | `open`, `push`, `back`, `close`, `openAfterClose` — keys and payloads are typed |
| `render({ ctx, payload, nav, name })` | `nav`: `back`, `close`, `dismiss`, `canGoBack`, `depth` |
| `configureModals({ Shell, translate, screen, beforeReopen })` | app-wide defaults |
| `ModalProvider` | scoped controller / shell / translate for a subtree |
| `useModalDraft({ initial, onCommit, onClose?, resetKey? })` | local draft until `success()`; `discard()` closes without commit |
| `toggleDraftId(ids, id)` | add/remove helper for multi-select drafts |
| `useModalDismissHandler(handler, enabled)` | intercept swipe/backdrop; return `true` to stay |
| `getDefaultModalController()` | open steps from non-React code: `controller.push(TaskModals.request("actions", { id }))` |

### `/react-native`

| Export | Purpose |
|---|---|
| `createSheetShell({ BackButton, TitleComponent, backAccessibilityLabel, appearance, useAppearance })` | build a shell for your design system |
| `SheetAppearance` | `sheetColor`, `handleColor`, `backdropColor`, `tintColor`, `cornerRadius` |
| `FitBox` / `ContentBox` / `BareBox` | bodies for `fit` / `form` / `scroll` layouts |
| `FooterContent` | keyboard-aware bottom spacer; wrap your buttons in it |
| `FooterHeight`, `SheetHeaderBar`, `useFitScrollNearEnd` | footer pad, title row, pagination inside `fit` |
| `KeyboardGeometryStore`, `useKeyboardGeometry` | shared keyboard geometry (`isOpen`, `height`, `open`, `closed`, `duration`) |

Layouts: `fit` hugs content and grows above the keyboard via `FooterContent`; `form` fills the max height and lifts with the keyboard; `scroll` fills the max height for lists.

### `/navigation`

`reactNavigationScreen` — pass to `configureModals({ screen })` so a Portal renders only on the focused screen and closes its sheet when the screen loses focus.

### `/kit`

| Export | Purpose |
|---|---|
| `KitSheetShell`, `createKitSheetShell(options)` | shell coloured by the kit theme |
| `ModalKitProvider theme={...}` | `colors`, `radius`, `gap`, `fontSize`, `labels`; nested providers merge |
| `ActionMenuSheet` | `items: { key, label, icon?, onPress, destructive?, hidden?, disabled? }[]` |
| `ConfirmSheet` | `title?`, `description?`, `content?`, `onConfirm`, `onCancel`, `destructive?`, `isLoading?`, `disabled?` |
| `OptionListSheet` | single choice: `items`, `selectedId`, `onSelect`, `emptyLabel?` |
| `CheckboxListSheet` | multi choice: draft (`initialSelectedIds`, `onConfirm(ids)`) or controlled (`selectedIds`, `onToggle`, `onConfirm`) |
| `KitButton`, `KitRow`, `KitCheckbox`, `KitHeader`, `KitTitle`, `KitEmpty` | primitives for your own bodies |

Dark theme example:

```tsx
<ModalKitProvider
    theme={{
        colors: { text: "#F2F2F5", muted: "#9A9AA5", border: "#2C2C33", surface: "#1E1E24", sheet: "#16161B", backdrop: "rgba(0,0,0,0.7)" },
    }}
>
```

## Cursor plugin

The repository is also a Cursor plugin (`.cursor-plugin/marketplace.json` → `plugins/react-native-modal-stack`). It ships:

- rule `modal-stack-authoring` — registry, layouts, navigation, keyboard and a checklist; attaches to modal files;
- skill `modal-stack-setup` — install and wire the library;
- skill `modal-stack-authoring` — build a multi-step sheet flow;
- skill `modal-keyboard-footer` — keep buttons above the keyboard.

Install:

- **Cursor** → Settings → Plugins → add from GitHub: `SlavaYakimov/reactNativeModal`.
- **Skills only, any agent:** `npx skills add SlavaYakimov/reactNativeModal --agent cursor`.
- **Manually:** copy `plugins/react-native-modal-stack/rules/*.mdc` into `.cursor/rules/` and `plugins/react-native-modal-stack/skills/*` into `.cursor/skills/`.

## Example app

```bash
cd example
npm install
npx expo start        # i / a for simulators, w for web
```

The example shows a task list: action menu → status picker, tags draft, rename form, destructive confirm with an async delete, a live stack-depth badge and a light/dark kit theme. Metro resolves the library from `../src`, so edits show up without a build.

## Development

```bash
npm install
npm run check          # typecheck, tests, build, plugin validation
npm run format
```

## По-русски

Библиотека стековых bottom-sheet модалок для React Native и Expo.

- `push` открывает вложенный шаг, стрелка «Назад» возвращает на предыдущий, свайп или тап по фону снимают по одному шагу.
- Реестр фичи типизирован: `open("key", payload)` не скомпилируется без нужного payload.
- Шторка учитывает клавиатуру: кнопки в `FooterContent` остаются над ней.
- Готовые тела (меню действий, подтверждение, одиночный и множественный выбор) с темой — или свой дизайн через `createSheetShell`.
- Cursor-плагин с правилом и скиллами: установка — Settings → Plugins → `SlavaYakimov/reactNativeModal`, либо `npx skills add SlavaYakimov/reactNativeModal --agent cursor`.

Установка: `npm i github:SlavaYakimov/reactNativeModal` (до публикации в npm). Пример: `cd example && npm install && npx expo start`.

## License

MIT © Slava Yakimov
