---
name: modal-stack-authoring
description: >-
  Builds a feature's bottom-sheet flow with @slavayakimov/react-native-modal-stack — a typed
  registry, payload vs context, push/back between steps, kit sheets (ActionMenuSheet,
  ConfirmSheet, OptionListSheet, CheckboxListSheet), draft editing and async confirm.
  Use when creating or changing a modal, an action menu, a confirm dialog, a picker or a
  multi-step sheet in an app that uses this library.
  Triggers: add a modal, action sheet, confirm sheet, nested modal step, back in modal,
  добавить модалку, шторка с подтверждением, вложенный шаг модалки, назад в модалке.
license: MIT
metadata:
  version: 0.1.0
---

# Modal stack authoring

The rule `modal-stack-authoring.mdc` from this plugin holds the reference tables; this skill is the procedure.

## Procedure

1. **Name the flow.** One registry per feature: `createModalRegistry<Ctx>("feature")`. Keys are short and local (`actions`, `status`, `rename`, `deleteConfirm`).
2. **Split data.** Everything the screen owns and may change while the sheet is open (`items`, handlers, `isPending`) goes into `Ctx` and arrives via `Portal` props. The step's target (`{ id }`) is the payload.
3. **Declare steps** with `m.def<Payload>({ layout, title?, render })`. `render` gets `{ ctx, payload, nav, name }`.
4. **Pick bodies.**
   - Menu → `ActionMenuSheet` (items call `push`).
   - Single choice → `OptionListSheet` (`onSelect` → commit → `nav.close()`).
   - Multi choice → `CheckboxListSheet initialSelectedIds onConfirm` (draft; closes the stack itself).
   - Destructive → `ConfirmSheet destructive onCancel={nav.canGoBack ? nav.back : nav.close}`.
   - Text input → own body with `useModalDraft` + `FooterContent` wrapping the save button.
5. **Titles.** Pushed steps take `title` from the registry (back arrow and title share one row). The first step may pass `title` to the kit sheet instead.
6. **Mount** `<FeatureModals.Portal {...ctx} />` once on the screen, next to the content; open with `FeatureModals.useModal().open("actions", { id })`.
7. **Async.** Keep the mutation on the screen; pass `isPending` through `ctx` into `isLoading`; close in `onSuccess`. Draft + async: `useModalDraft({ initial, onCommit, onClose: () => undefined })`.

## Draft body example

```tsx
function RenameBody({ ctx, target }: { ctx: Ctx; target: Target }) {
    const task = ctx.tasks.find((t) => t.id === target.id);
    const { draft, setDraft, success } = useModalDraft({
        initial: task?.title ?? "",
        onCommit: (value) => ctx.onRename(target.id, value.trim()),
    });
    return (
        <>
            <TextInput value={draft} onChangeText={setDraft} />
            <FooterContent>
                <KitButton label="Save" disabled={!draft.trim()} onPress={success} />
            </FooterContent>
        </>
    );
}
```

## Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Back arrow on its own row above the title | Title rendered in the body of a pushed step | Move `title` to the registry |
| Cancel closes the whole stack | `onCancel={nav.close}` at depth > 1 | `nav.canGoBack ? nav.back : nav.close` |
| Next sheet flashes or does not open | `openAfterClose` inside one registry, or `open` across registries while one is closing | `push` inside a registry; `openAfterClose` across registries |
| Stale list in the sheet | List passed through payload | Move it to `Ctx` |
| Sheet stays over the next screen | No screen adapter | `configureModals({ screen: reactNavigationScreen })` |
| Button hidden by the keyboard | `fit` body without `FooterContent` | Wrap the buttons in `FooterContent` |

## Verify

Run the flow: open → push → back → swipe → confirm with a slow request (spinner, disabled buttons, close on success) → leave the screen. Unit tests can drive `getDefaultModalController()` or a `ModalProvider` with `new ModalController()` and assert `controller.depth`.
