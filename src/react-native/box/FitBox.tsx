import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

const FIT_PAD_STYLE: ViewStyle = {
    paddingHorizontal: 16,
};

const FIT_MEASURE_STYLE: ViewStyle = {
    gap: 12,
};

type NearEndListener = () => void;

const FitScrollNearEndContext = createContext<((listener: NearEndListener) => () => void) | null>(null);

/**
 * Subscribe to FitBox scroll nearing the bottom (for pagination inside `fit` sheets).
 */
export function useFitScrollNearEnd(listener: NearEndListener, enabled = true) {
    const subscribe = useContext(FitScrollNearEndContext);
    const listenerRef = useRef(listener);
    useEffect(() => {
        listenerRef.current = listener;
    });

    useEffect(() => {
        if (!enabled || !subscribe) {
            return;
        }
        return subscribe(() => listenerRef.current());
    }, [enabled, subscribe]);
}

type FitBoxProps = {
    children: React.ReactNode;
    /** Cap from shell (`sheetMaxHeight` minus handle / shell title). */
    maxHeight?: number;
    style?: StyleProp<ViewStyle>;
};

/**
 * Fit box (`layout: "fit"`) — shrink-wrap to content under `maxHeight`.
 * Uses a plain `View` when content fits (avoids ScrollView eating maxHeight).
 * Switches to ScrollView only when measured content overflows the cap.
 */
export function FitBox({ children, maxHeight, style }: FitBoxProps) {
    const listenersRef = useRef(new Set<NearEndListener>());
    const [contentHeight, setContentHeight] = useState(0);

    const subscribe = useCallback((listener: NearEndListener) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        if (layoutMeasurement.height + contentOffset.y < contentSize.height - 48) {
            return;
        }
        listenersRef.current.forEach((listener) => listener());
    };

    const onMeasureLayout = useCallback((event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout.height;
        if (next <= 0) {
            return;
        }
        setContentHeight((prev) => (prev === next ? prev : next));
    }, []);

    const needsScroll = maxHeight != null && contentHeight > maxHeight + 0.5;

    const body = (
        <View style={FIT_MEASURE_STYLE} onLayout={onMeasureLayout}>
            {children}
        </View>
    );

    return (
        <FitScrollNearEndContext.Provider value={subscribe}>
            {needsScroll ? (
                <ScrollView
                    style={[{ maxHeight, height: maxHeight }, style]}
                    contentContainerStyle={FIT_PAD_STYLE}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces
                    nestedScrollEnabled
                    scrollEventThrottle={16}
                    onScroll={onScroll}
                >
                    {body}
                </ScrollView>
            ) : (
                <View style={[FIT_PAD_STYLE, { maxHeight }, style]}>{body}</View>
            )}
        </FitScrollNearEndContext.Provider>
    );
}
