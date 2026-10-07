---
name: modal-keyboard-footer
description: >-
  Keeps sheet buttons above the keyboard in @slavayakimov/react-native-modal-stack — choosing
  fit, form or scroll layout, placing FooterContent inside or outside a scroll container, and
  reading KeyboardGeometryStore instead of Keyboard listeners. Use when a modal has a text
  input, the keyboard covers Save/Confirm, the sheet jumps twice, or a list sheet needs a footer.
  Triggers: keyboard covers modal button, FooterContent, sheet keyboard offset,
  клавиатура перекрывает кнопку, отступ под клавиатуру в модалке.
license: MIT
metadata:
  version: 0.1.0
---

# Keyboard-aware footers

`KeyboardGeometryStore` subscribes to the keyboard once for the whole app (it starts on the first subscriber). The shell sizes the sheet; `FooterContent` grows a bottom spacer from the store so buttons stay above the keyboard.

## Layout decides who owns the keyboard

| `layout` | Body box | Sheet height | Keyboard owner |
|---|---|---|---|
| `fit` | `FitBox` | measured content | `FooterContent` (default `includeKeyboard`) — the shell does not lift |
| `form` | `ContentBox` | fills max height | the shell lifts and shrinks; footer uses `includeKeyboard={false}` or `FooterHeight` |
| `scroll` | `BareBox` | fills max height | the shell, like `form` |

One owner per sheet. `form` + `FooterContent includeKeyboard` = double offset.

## FooterContent

```tsx
import { FooterContent } from "@slavayakimov/react-native-modal-stack/react-native";

<FooterContent>
    <KitButton label="Save" onPress={success} />
</FooterContent>

<FooterContent /> // spacer only
```

| Prop | Meaning |
|---|---|
| `includeKeyboard` (default `true`) | keyboard open → keyboard height; closed → bottom safe-area inset |
| `extra` | constant added on top |
| `enabled` | turn the spacer off locally |

## Placement

```
Body has a ScrollView / FlatList?
  yes → FooterContent is the last child INSIDE the scroll container
  no  → FooterContent after the body
Body has Save / Confirm buttons?
  yes → wrap the buttons in FooterContent
  no  → FooterContent as a trailing spacer
```

Kit sheets (`ConfirmSheet`, `CheckboxListSheet`) already wrap their buttons.

## Do / Don't

| Do | Don't |
|---|---|
| `useKeyboardGeometry()` for `{ isOpen, height, open, closed, duration }` | `Keyboard.addListener` inside a modal body |
| `fit` for content-sized sheets with inputs | Fixed `paddingBottom` for the keyboard |
| Wrap primary actions | Leave Save under the keypad |
| `openAfterClose` when the next sheet must wait for the keyboard to hide | `open` right after `Keyboard.dismiss()` |

## Verify

1. Open the sheet — height hugs content.
2. Focus the input — the keyboard opens, the primary button stays visible.
3. Hide the keyboard — the spacer returns to the safe-area inset.
4. Close with the keyboard open — the next open starts clean.
5. `form`/`scroll` sheets still lift once, not twice.
