import type React from "react";
import { View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BODY_STYLE: ViewStyle = {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
};

/** ContentBox (`layout: "form"`) — input-ready body. Keyboard geometry lives in the shell, not here. */
export function ContentBox({ children }: { children: React.ReactNode }) {
    return <View style={BODY_STYLE}>{children}</View>;
}

/** Safe-area spacer under modal body content. */
export function FooterHeight({ extra = 32 }: { extra?: number }) {
    const insets = useSafeAreaInsets();
    return <View style={{ height: insets.bottom + extra }} />;
}
