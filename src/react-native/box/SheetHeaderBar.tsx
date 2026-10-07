import type React from "react";
import { type ComponentType } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

export type SheetTitleProps = { children: string };

export type SheetHeaderBarProps = {
    /** Already translated title text */
    title: string;
    compact?: boolean;
    onPress?: () => void;
    leftContent?: React.ReactNode;
    rightContent?: React.ReactNode;
    /**
     * Negative horizontal margin to cancel FitBox/ContentBox `paddingHorizontal: 16`
     * when the header sits inside the padded body.
     */
    bleed?: boolean;
    style?: StyleProp<ViewStyle>;
    /** Design-system title text; defaults to a plain RN Text. */
    TitleComponent?: ComponentType<SheetTitleProps>;
};

function DefaultTitle({ children }: SheetTitleProps) {
    return <Text style={styles.title}>{children}</Text>;
}

/** Compact sheet title used by short (`fit`) modals. */
export function SheetHeaderBar({
    title,
    compact = true,
    onPress,
    leftContent,
    rightContent,
    bleed = false,
    style,
    TitleComponent = DefaultTitle,
}: SheetHeaderBarProps) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.bar,
                { paddingVertical: compact ? 12 : 24 },
                // Bleed: stretch past FitBox/ContentBox pad — avoid width:100% + overflow:hidden
                // (that combo clips the right edge and leaves actions inset).
                bleed ? styles.bleed : styles.full,
                style,
            ]}
        >
            {leftContent}
            <View style={styles.titleWrap}>
                <TitleComponent>{title}</TitleComponent>
            </View>
            {rightContent ? <View style={styles.right}>{rightContent}</View> : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 16,
    },
    bleed: { alignSelf: "stretch", marginHorizontal: -16 },
    full: { width: "100%" },
    titleWrap: { flex: 1, flexShrink: 1, minWidth: 0 },
    right: { flexShrink: 0 },
    title: { fontSize: 18, fontWeight: "600", color: "#1B1631" },
});
