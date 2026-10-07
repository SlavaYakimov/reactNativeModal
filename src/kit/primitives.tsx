import type React from "react";
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { SheetHeaderBar, type SheetTitleProps } from "../react-native/box/SheetHeaderBar";
import { useModalKitTheme } from "./theme";

export type KitButtonVariant = "primary" | "secondary" | "danger";

export type KitButtonProps = {
    label: string;
    onPress: () => void;
    variant?: KitButtonVariant;
    disabled?: boolean;
    isLoading?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
};

export function KitButton({
    label,
    onPress,
    variant = "primary",
    disabled = false,
    isLoading = false,
    style,
    testID,
}: KitButtonProps) {
    const { colors, radius, fontSize } = useModalKitTheme();
    const palette = {
        primary: { background: colors.accent, text: colors.onAccent, border: colors.accent },
        danger: { background: colors.danger, text: colors.onDanger, border: colors.danger },
        secondary: { background: colors.surface, text: colors.text, border: colors.border },
    }[variant];
    const inactive = disabled || isLoading;

    return (
        <Pressable
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: inactive, busy: isLoading }}
            onPress={onPress}
            disabled={inactive}
            style={({ pressed }) => [
                styles.button,
                {
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    borderRadius: radius,
                    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                },
                style,
            ]}
        >
            {isLoading ? (
                <ActivityIndicator color={palette.text} />
            ) : (
                <Text style={[styles.buttonText, { color: palette.text, fontSize: fontSize.body }]}>{label}</Text>
            )}
        </Pressable>
    );
}

export function KitCheckbox({ checked }: { checked: boolean }) {
    const { colors } = useModalKitTheme();
    return (
        <View
            style={[
                styles.checkbox,
                { borderColor: checked ? colors.accent : colors.border },
                checked && { backgroundColor: colors.accent },
            ]}
        >
            {checked ? <View style={[styles.tick, { borderColor: colors.onAccent }]} /> : null}
        </View>
    );
}

export function KitCheckMark() {
    const { colors } = useModalKitTheme();
    return <View style={[styles.mark, { borderColor: colors.accent }]} />;
}

export function KitEmpty({ label }: { label?: string }) {
    const { colors, radius, fontSize, labels } = useModalKitTheme();
    return (
        <View style={[styles.empty, { borderColor: colors.border, borderRadius: radius }]}>
            <Text style={{ color: colors.muted, fontSize: fontSize.caption }}>{label ?? labels.empty}</Text>
        </View>
    );
}

/** Sheet title in the kit typography. */
export function KitTitle({ children }: SheetTitleProps) {
    const { colors, fontSize } = useModalKitTheme();
    return <Text style={[styles.title, { color: colors.text, fontSize: fontSize.title }]}>{children}</Text>;
}

/** In-body sheet title. Leave it out when the registry entry already has a `title`. */
export function KitHeader({ title }: { title?: string }) {
    if (!title) {
        return null;
    }
    return <SheetHeaderBar title={title} compact bleed TitleComponent={KitTitle} />;
}

export type KitRowProps = {
    onPress: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    testID?: string;
    accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
    accessibilityRole?: "button" | "radio" | "checkbox";
};

export function KitRow({ onPress, disabled, children, testID, accessibilityState, accessibilityRole }: KitRowProps) {
    const { colors, radius } = useModalKitTheme();
    return (
        <Pressable
            testID={testID}
            accessibilityRole={accessibilityRole ?? "button"}
            accessibilityState={{ disabled, ...accessibilityState }}
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.row,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: radius,
                    opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
                },
            ]}
        >
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        borderWidth: 1,
    },
    buttonText: { fontWeight: "600" },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    tick: {
        width: 12,
        height: 7,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        transform: [{ rotate: "-45deg" }, { translateY: -1 }],
    },
    mark: {
        width: 14,
        height: 8,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        transform: [{ rotate: "-45deg" }],
        marginRight: 4,
    },
    empty: {
        alignItems: "center",
        padding: 16,
        borderWidth: 1,
        borderStyle: "dashed",
    },
    title: { fontWeight: "600" },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
    },
});
