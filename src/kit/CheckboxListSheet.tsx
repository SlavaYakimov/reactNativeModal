import { StyleSheet, Text, View } from "react-native";

import { toggleDraftId, useModalDraft } from "../react/useModalDraft";
import { FooterContent } from "../react-native/box/FooterContent";
import type { OptionId } from "./OptionListSheet";
import { KitButton, KitCheckbox, KitEmpty, KitHeader, KitRow } from "./primitives";
import { useModalKitTheme } from "./theme";

export type CheckboxListItem = {
    id: OptionId;
    label: string;
    disabled?: boolean;
};

type CommonProps = {
    title?: string;
    items: CheckboxListItem[];
    confirmLabel?: string;
    emptyLabel?: string;
};

/** Parent owns the selection and commits on every toggle. */
export type CheckboxListControlledProps = CommonProps & {
    selectedIds: OptionId[];
    onToggle: (item: CheckboxListItem) => void;
    onConfirm: () => void;
};

/** Selection stays local until the confirm button; `onConfirm(ids)` receives the result. */
export type CheckboxListDraftProps = CommonProps & {
    initialSelectedIds: OptionId[];
    onConfirm: (selectedIds: OptionId[]) => void;
    /** Reset the draft when this changes (for a body that stays mounted). */
    resetKey?: string | number | boolean | null;
    /** Defaults to closing the whole stack after `onConfirm`; pass `() => undefined` to keep it open (async commit). */
    onClose?: () => void;
};

export type CheckboxListSheetProps = CheckboxListControlledProps | CheckboxListDraftProps;

function CheckboxListView({
    title,
    items,
    selectedIds,
    confirmLabel,
    emptyLabel,
    onToggle,
    onConfirm,
}: CheckboxListControlledProps) {
    const { colors, gap, fontSize, labels } = useModalKitTheme();
    const selected = new Set(selectedIds.map(String));

    return (
        <>
            <KitHeader title={title} />
            <View style={{ gap }}>
                {items.length === 0 ? (
                    <KitEmpty label={emptyLabel} />
                ) : (
                    items.map((item) => {
                        const checked = selected.has(String(item.id));
                        return (
                            <KitRow
                                key={String(item.id)}
                                testID={`checkbox-${item.id}`}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked }}
                                disabled={item.disabled}
                                onPress={() => onToggle(item)}
                            >
                                <Text style={[styles.label, { color: colors.text, fontSize: fontSize.body }]}>
                                    {item.label}
                                </Text>
                                <KitCheckbox checked={checked} />
                            </KitRow>
                        );
                    })
                )}
            </View>
            <FooterContent includeKeyboard>
                <KitButton
                    testID="checkbox-confirm"
                    label={confirmLabel ?? labels.select}
                    onPress={onConfirm}
                    style={styles.confirm}
                />
            </FooterContent>
        </>
    );
}

function CheckboxListDraft({ initialSelectedIds, onConfirm, resetKey, onClose, ...rest }: CheckboxListDraftProps) {
    const { draft, setDraft, success } = useModalDraft<OptionId[]>({
        initial: initialSelectedIds,
        resetKey,
        onCommit: onConfirm,
        onClose,
    });

    return (
        <CheckboxListView
            {...rest}
            selectedIds={draft}
            onToggle={(item) => setDraft((prev) => toggleDraftId(prev, item.id))}
            onConfirm={success}
        />
    );
}

function isControlled(props: CheckboxListSheetProps): props is CheckboxListControlledProps {
    return "selectedIds" in props;
}

/** Multi-select list for a `fit` sheet. Prefer the draft form (`initialSelectedIds` + `onConfirm(ids)`). */
export function CheckboxListSheet(props: CheckboxListSheetProps) {
    if (isControlled(props)) {
        return <CheckboxListView {...props} />;
    }
    return <CheckboxListDraft {...props} />;
}

const styles = StyleSheet.create({
    label: { flex: 1 },
    confirm: { marginTop: 24 },
});
