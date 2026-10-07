import { type ComponentType, type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ModalLayout } from "../core";
import type { ModalShellProps } from "../react";
import { BareBox } from "./box/BareBox";
import { ContentBox } from "./box/ContentBox";
import { FitBox } from "./box/FitBox";
import { SheetHeaderBar, type SheetTitleProps } from "./box/SheetHeaderBar";
import { useKeyboardGeometry } from "./keyboardGeometry";

const SPRING_CONFIG = {
    damping: 18,
    stiffness: 120,
};

/** Matches previous BottomModal `maxDynamicContentSize={SCREEN_HEIGHT - 92}`. */
const MAX_SHEET_INSET = 92;
const KEYBOARD_GAP = 24;
/** Handle bar + sheet padding-top budget for fit ScrollView maxHeight. */
const FIT_HANDLE_CHROME = 36;
/** Shell title SheetHeaderBar (when not rendered inside FitBox children). */
const FIT_SHELL_TITLE_CHROME = 56;
/** Back-only header row shown when a nested sheet has no registry title. */
const FIT_BACK_ROW_CHROME = 40;

function resolveMaxHeight(screenHeight: number, keyboardHeight: number) {
    if (keyboardHeight > 0) {
        return Math.max(160, screenHeight - keyboardHeight - KEYBOARD_GAP);
    }
    return Math.max(160, screenHeight - MAX_SHEET_INSET);
}

function LayoutBox({
    children,
    layout,
    fitMaxHeight,
    fitKey,
}: {
    children: ReactNode;
    layout: ModalLayout;
    fitMaxHeight?: number;
    /** Bumps when a fit sheet opens so FitBox remounts and remeasures. */
    fitKey?: number;
}) {
    switch (layout) {
        case "scroll":
            return <BareBox>{children}</BareBox>;
        case "fit":
            return (
                <FitBox key={fitKey} maxHeight={fitMaxHeight}>
                    {children}
                </FitBox>
            );
        default:
            return <ContentBox>{children}</ContentBox>;
    }
}

export type SheetBackButtonProps = { onPress: () => void; accessibilityLabel: string; tintColor: string };

function DefaultBackButton({ onPress, accessibilityLabel, tintColor }: SheetBackButtonProps) {
    return (
        <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
            <Text style={[styles.back, { color: tintColor }]}>‹</Text>
        </Pressable>
    );
}

type AccessibilityLabel = string | (() => string);

/** Colors and radius of the sheet chrome. Every field is optional and falls back to the light default. */
export type SheetAppearance = {
    sheetColor?: string;
    handleColor?: string;
    backdropColor?: string;
    /** Default back button color. */
    tintColor?: string;
    cornerRadius?: number;
};

const DEFAULT_APPEARANCE: Required<SheetAppearance> = {
    sheetColor: "#FFFFFF",
    handleColor: "#E2E8F0",
    backdropColor: "rgba(0, 0, 0, 0.5)",
    tintColor: "#1B1631",
    cornerRadius: 24,
};

export type SheetShellOptions = {
    TitleComponent?: ComponentType<SheetTitleProps>;
    /** Shown in the shell header when `canGoBack` and no explicit `leftContent`. */
    BackButton?: ComponentType<SheetBackButtonProps>;
    /** Screen-reader label for the back button; a function is read on every render so it follows the locale. */
    backAccessibilityLabel?: AccessibilityLabel;
    /** Static chrome colors. */
    appearance?: SheetAppearance;
    /** Hook read on every render (theme context, color scheme); wins over `appearance`. */
    useAppearance?: () => SheetAppearance;
};

export function createSheetShell({
    TitleComponent,
    BackButton = DefaultBackButton,
    backAccessibilityLabel = "Back",
    appearance,
    useAppearance,
}: SheetShellOptions = {}) {
    const useLook = (): Required<SheetAppearance> => ({ ...DEFAULT_APPEARANCE, ...appearance, ...useAppearance?.() });

    return function SheetShell({
        visible,
        layout,
        title,
        canGoBack,
        onDismiss,
        onBack,
        leftContent,
        rightContent,
        children,
    }: ModalShellProps) {
        const look = useLook();
        const { height: screenHeight } = useWindowDimensions();
        const insets = useSafeAreaInsets();
        const [mounted, setMounted] = useState(false);
        const [fitKey, setFitKey] = useState(0);

        const translateY = useSharedValue(screenHeight);
        const opacity = useSharedValue(0);
        const keyboardLift = useSharedValue(0);
        const maxHeightShared = useSharedValue(resolveMaxHeight(screenHeight, 0));

        const keyboardEnabled = mounted && visible;
        const keyboard = useKeyboardGeometry();
        /**
         * `fit` — content-sized; keyboard space comes from FooterContent (no shell lift).
         * `form`/`scroll` — shell lifts + shrinks maxHeight.
         */
        const isFit = layout === "fit";
        const fillSheet = !isFit;
        const applyShellKeyboard = keyboardEnabled && fillSheet;
        const keyboardHeight = applyShellKeyboard ? keyboard.height : 0;
        const keyboardOpen = keyboardEnabled && keyboard.isOpen;

        // Fit keeps full maxHeight so FooterContent keyboard spacer can grow the sheet upward.
        const sheetMaxHeight = resolveMaxHeight(screenHeight, isFit ? 0 : keyboardHeight);
        const showBackRow = !title && (leftContent != null || canGoBack);
        let headerChrome = 0;
        if (title) {
            headerChrome = FIT_SHELL_TITLE_CHROME;
        } else if (showBackRow) {
            headerChrome = FIT_BACK_ROW_CHROME;
        }
        const fitMaxHeight = sheetMaxHeight - FIT_HANDLE_CHROME - headerChrome;
        const keyboardPadding = keyboardHeight > 0 ? 12 : insets.bottom;
        const sheetPaddingBottom = isFit ? 0 : keyboardPadding;

        // Remount FitBox on each show so onLayout remeasures (auto-open after form/keyboard).
        useLayoutEffect(() => {
            if (visible && isFit) {
                setFitKey((k) => k + 1);
            }
        }, [visible, isFit, layout]);

        useEffect(() => {
            if (visible) {
                setMounted(true);
            }
        }, [visible]);

        useEffect(() => {
            maxHeightShared.value = sheetMaxHeight;
        }, [maxHeightShared, sheetMaxHeight]);

        useEffect(() => {
            if (!mounted) {
                return;
            }

            if (visible) {
                opacity.value = withTiming(1, { duration: 250 });
                translateY.value = withSpring(0, SPRING_CONFIG);
                return;
            }

            keyboardLift.value = withTiming(0, { duration: 200 });
            opacity.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(screenHeight, { duration: 250 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(setMounted)(false);
                }
            });
            // Fallback if the close animation is interrupted (tab switch) and never finishes.
            const fallback = setTimeout(() => setMounted(false), 320);
            return () => clearTimeout(fallback);
        }, [visible, keyboardLift, mounted, opacity, screenHeight, translateY]);

        useEffect(() => {
            if (!applyShellKeyboard) {
                keyboardLift.value = 0;
                return;
            }

            const lift = keyboard.isOpen ? Math.max(0, keyboard.open.height - insets.bottom) : 0;
            keyboardLift.value = withTiming(lift, { duration: keyboard.duration });
        }, [applyShellKeyboard, keyboard.duration, keyboard.isOpen, keyboard.open.height, keyboardLift, insets.bottom]);

        const panGesture = Gesture.Pan()
            .enabled(!keyboardOpen)
            .activeOffsetY(12)
            .failOffsetX([-24, 24])
            .onUpdate((event) => {
                if (event.translationY > 0) {
                    translateY.value = event.translationY;
                }
            })
            .onEnd((event) => {
                if (event.translationY > 120 || event.velocityY > 500) {
                    runOnJS(onDismiss)();
                } else {
                    translateY.value = withSpring(0, SPRING_CONFIG);
                }
            });

        const backdropStyle = useAnimatedStyle(() => ({
            opacity: opacity.value,
        }));

        const modalStyle = useAnimatedStyle(() => {
            const maxH = maxHeightShared.value;
            return {
                transform: [{ translateY: translateY.value }],
                bottom: keyboardLift.value,
                maxHeight: maxH,
                // Must set height on every mode switch — Reanimated keeps the previous
                // property if omitted, so form→fit would keep the tall fillSheet height.
                height: fillSheet ? maxH : "auto",
            };
        }, [fillSheet]);

        if (!mounted) {
            return null;
        }

        const headerLeft =
            leftContent ??
            (canGoBack ? (
                <BackButton
                    onPress={onBack}
                    tintColor={look.tintColor}
                    accessibilityLabel={
                        typeof backAccessibilityLabel === "function" ? backAccessibilityLabel() : backAccessibilityLabel
                    }
                />
            ) : undefined);
        let header: ReactNode = null;
        if (title) {
            header = (
                <SheetHeaderBar
                    title={title}
                    compact={isFit}
                    leftContent={headerLeft}
                    rightContent={rightContent}
                    TitleComponent={TitleComponent}
                />
            );
        } else if (showBackRow) {
            header = <View style={styles.backRow}>{headerLeft}</View>;
        } else if (!isFit) {
            header = <View style={styles.emptyHeader} />;
        }

        return (
            <View style={[styles.container, { pointerEvents: visible ? "auto" : "none" }]}>
                <Animated.View style={[styles.backdrop, { backgroundColor: look.backdropColor }, backdropStyle]}>
                    <Pressable style={styles.backdropPressable} onPress={onDismiss} />
                </Animated.View>

                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.sheet,
                            {
                                backgroundColor: look.sheetColor,
                                borderTopLeftRadius: look.cornerRadius,
                                borderTopRightRadius: look.cornerRadius,
                            },
                            modalStyle,
                            { paddingBottom: sheetPaddingBottom },
                        ]}
                    >
                        {/*
                          fillSheet (form/scroll): intermediate flex:1 is required — BareBox/ContentBox
                          and FlatLists use flex:1; without a bounded flex parent their height collapses to 0.
                          fit: no flex so content can measure intrinsic height under maxHeight.
                        */}
                        <View style={fillSheet ? styles.fill : undefined}>
                            {(!!title?.trim() || isFit) && (
                                <View style={styles.handleWrap}>
                                    <View style={[styles.handle, { backgroundColor: look.handleColor }]} />
                                </View>
                            )}

                            {header}
                            <LayoutBox layout={layout} fitMaxHeight={isFit ? fitMaxHeight : undefined} fitKey={fitKey}>
                                {children}
                            </LayoutBox>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    };
}

export const SheetShell = createSheetShell();

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropPressable: { flex: 1 },
    sheet: {
        position: "absolute",
        left: 0,
        right: 0,
        paddingTop: 8,
        zIndex: 10000,
        overflow: "hidden",
    },
    fill: { flex: 1 },
    handleWrap: { alignItems: "center", paddingVertical: 8 },
    handle: { width: 40, height: 4, borderRadius: 2 },
    emptyHeader: { paddingVertical: 4 },
    backRow: { height: FIT_BACK_ROW_CHROME, justifyContent: "center", paddingHorizontal: 16 },
    back: { fontSize: 28, lineHeight: 28 },
});
