import { createSheetShell, type SheetAppearance, type SheetShellOptions } from "../react-native/SheetShell";
import { KitTitle } from "./primitives";
import { useModalKitTheme } from "./theme";

function useKitSheetAppearance(): SheetAppearance {
    const { colors } = useModalKitTheme();
    return {
        sheetColor: colors.sheet,
        handleColor: colors.border,
        backdropColor: colors.backdrop,
        tintColor: colors.text,
    };
}

/** Sheet shell that follows the nearest `ModalKitProvider`: background, handle, backdrop and title. */
export function createKitSheetShell(options: Omit<SheetShellOptions, "TitleComponent" | "useAppearance"> = {}) {
    return createSheetShell({ ...options, TitleComponent: KitTitle, useAppearance: useKitSheetAppearance });
}

export const KitSheetShell = createKitSheetShell();
