import type React from "react";
import { useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardGeometry } from "../keyboardGeometry";

type FooterContentProps = {
    /** Content above the animated keyboard spacer. */
    children?: React.ReactNode;
    /** Extra height always added on top of the spacer target. */
    extra?: number;
    /**
     * When true (fit modals), spacer grows by keyboard `open.height` so the sheet
     * expands upward without shell `bottom` lift.
     * When false, only safe-area / compact pad (shell owns keyboard lift).
     */
    includeKeyboard?: boolean;
    enabled?: boolean;
    style?: StyleProp<ViewStyle>;
};

/**
 * Footer spacer for modal sheets.
 * With `includeKeyboard`: open → open.height + extra, closed → insets.bottom + extra.
 * Default `extra=16` keeps content off the home indicator / sheet edge.
 */
export function FooterContent({
    children,
    extra = 16,
    includeKeyboard = true,
    enabled = true,
    style,
}: FooterContentProps) {
    const keyboard = useKeyboardGeometry();
    const insets = useSafeAreaInsets();
    const open = enabled && keyboard.isOpen;
    let layoutHeight: number;
    if (!enabled) {
        layoutHeight = extra;
    } else if (includeKeyboard && open) {
        // Keyboard frame already reaches the screen bottom (incl. home indicator).
        layoutHeight = keyboard.open.height + extra;
    } else if (open) {
        layoutHeight = 12 + extra;
    } else {
        layoutHeight = insets.bottom + extra;
    }
    const duration = open ? keyboard.open.duration : keyboard.closed.duration;
    const spacerHeight = useSharedValue(layoutHeight);

    useEffect(() => {
        spacerHeight.value = withTiming(layoutHeight, { duration });
    }, [duration, layoutHeight, spacerHeight]);

    const spacerStyle = useAnimatedStyle(() => ({
        height: spacerHeight.value,
    }));

    return (
        <>
            {children}
            <Animated.View style={[style, { minHeight: layoutHeight }, spacerStyle]} />
        </>
    );
}
