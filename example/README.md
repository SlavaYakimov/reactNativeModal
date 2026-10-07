# Example

Expo playground for `@slavayakimov/react-native-modal-stack`.

```bash
npm install
npm run ios      # or: npm run android, npm run web
```

What to try:

- tap a task → action menu (stack depth 1);
- **Change status** / **Edit tags** / **Rename** push a nested step with a back arrow (depth 2);
- swipe down or tap the backdrop — one step is dismissed at a time;
- **Delete** → destructive confirm with an 800 ms fake request (spinner, disabled buttons, closes on success);
- the **Dark** switch nests a `ModalKitProvider` with dark colours — the sheet, rows and buttons follow it.

`metro.config.js` resolves the library from `../src` and blocks the root `node_modules`, so React and Reanimated exist once and library edits hot-reload.
