import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FooterContent } from "../react-native/box/FooterContent";
import { KitHeader, KitRow } from "./primitives";
import { useModalKitTheme } from "./theme";

export type ActionMenuItem = {
    key: string;
    label: string;
    icon?: React.ReactNode;
    onPress: () => void;
    /** Paints the label with the theme `danger` color. */
    destructive?: boolean;
    hidden?: boolean;
    disabled?: boolean;
};

export type ActionMenuSheetProps = {
    /** In-body title; omit when the registry entry has a `title`. */
    title?: string;
    items: ActionMenuItem[];
};

/** List of actions for a `fit` sheet. Each row usually calls `push` to the next step. */
export function ActionMenuSheet({ title, items }: ActionMenuSheetProps) {
    const { colors, gap, fontSize } = useModalKitTheme();
    const visible = items.filter((item) => !item.hidden);

    return (
        <>
            <KitHeader title={title} />
            <View style={{ gap }}>
                {visible.map((item) => (
                    <KitRow
                        key={item.key}
                        testID={`action-${item.key}`}
                        onPress={item.onPress}
                        disabled={item.disabled}
                    >
                        {item.icon}
                        <Text
                            style={[
                                styles.label,
                                { color: item.destructive ? colors.danger : colors.text, fontSize: fontSize.body },
                            ]}
                        >
                            {item.label}
                        </Text>
                    </KitRow>
                ))}
            </View>
            <FooterContent includeKeyboard />
        </>
    );
}

const styles = StyleSheet.create({
    label: { flex: 1 },
});
