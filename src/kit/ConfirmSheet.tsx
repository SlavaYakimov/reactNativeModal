import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FooterContent } from "../react-native/box/FooterContent";
import { KitButton, KitHeader } from "./primitives";
import { useModalKitTheme } from "./theme";

export type ConfirmSheetProps = {
    title?: string;
    description?: string;
    /** Extra body between the description and the buttons (reason chips, an input). */
    content?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    /** Usually `nav.canGoBack ? nav.back : nav.close`. */
    onCancel: () => void;
    destructive?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
};

/** Two-button confirmation for a `fit` sheet. Keeps the sheet open until the caller closes it. */
export function ConfirmSheet({
    title,
    description,
    content,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    destructive = false,
    disabled = false,
    isLoading = false,
}: ConfirmSheetProps) {
    const { colors, gap, fontSize, labels } = useModalKitTheme();

    return (
        <>
            <KitHeader title={title} />
            <View style={{ gap }}>
                {description ? (
                    <Text style={{ color: colors.muted, fontSize: fontSize.body }}>{description}</Text>
                ) : null}
                {content}
            </View>
            <FooterContent includeKeyboard>
                <View style={[styles.buttons, { gap }]}>
                    <KitButton
                        testID="confirm-cancel"
                        variant="secondary"
                        label={cancelLabel ?? labels.cancel}
                        onPress={onCancel}
                        disabled={isLoading}
                        style={styles.button}
                    />
                    <KitButton
                        testID="confirm-ok"
                        variant={destructive ? "danger" : "primary"}
                        label={confirmLabel ?? labels.confirm}
                        onPress={onConfirm}
                        disabled={disabled}
                        isLoading={isLoading}
                        style={styles.button}
                    />
                </View>
            </FooterContent>
        </>
    );
}

const styles = StyleSheet.create({
    buttons: { flexDirection: "row", marginTop: 24 },
    button: { flex: 1 },
});
