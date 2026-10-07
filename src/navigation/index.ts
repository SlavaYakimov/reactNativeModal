import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback } from "react";

import type { ModalScreenAdapter } from "../react";

/** Portal shows only on the focused screen and closes its sheet when the screen blurs. */
export const reactNavigationScreen: ModalScreenAdapter = {
    useIsActive: useIsFocused,
    useOnLeave: (onLeave) => {
        useFocusEffect(useCallback(() => onLeave, [onLeave]));
    },
};
