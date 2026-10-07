import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FooterContent } from "../react-native/box/FooterContent";
import { KitCheckMark, KitEmpty, KitHeader, KitRow } from "./primitives";
import { useModalKitTheme } from "./theme";

export type OptionId = string | number;

export type OptionListItem = {
    id: OptionId;
    label: string;
    /** Secondary line under the label. */
    description?: string;
    disabled?: boolean;
};

export type OptionListSheetProps = {
    title?: string;
    items: OptionListItem[];
    /** Marks the row with a check. */
    selectedId?: OptionId | null;
    onSelect: (item: OptionListItem) => void;
    /** Search field or filters above the list. */
    header?: React.ReactNode;
    /** Spinner or "load more" below the list. */
    trailing?: React.ReactNode;
    /** Replaces the default empty hint. */
    emptyContent?: React.ReactNode;
    emptyLabel?: string;
};

/** Single-select list for a `fit` sheet. The caller decides whether to close or `push` on select. */
export function OptionListSheet({
    title,
    items,
    selectedId,
    onSelect,
    header,
    trailing,
    emptyContent,
    emptyLabel,
}: OptionListSheetProps) {
    const { colors, gap, fontSize } = useModalKitTheme();

    return (
        <>
            <KitHeader title={title} />
            {header}
            <View style={{ gap }}>
                {items.length === 0
                    ? (emptyContent ?? <KitEmpty label={emptyLabel} />)
                    : items.map((item) => {
                          const selected = selectedId != null && String(selectedId) === String(item.id);
                          return (
                              <KitRow
                                  key={String(item.id)}
                                  testID={`option-${item.id}`}
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected }}
                                  disabled={item.disabled}
                                  onPress={() => onSelect(item)}
                              >
                                  <View style={styles.text}>
                                      <Text style={{ color: colors.text, fontSize: fontSize.body }}>{item.label}</Text>
                                      {item.description ? (
                                          <Text style={{ color: colors.muted, fontSize: fontSize.caption }}>
                                              {item.description}
                                          </Text>
                                      ) : null}
                                  </View>
                                  {selected ? <KitCheckMark /> : null}
                              </KitRow>
                          );
                      })}
                {trailing}
            </View>
            <FooterContent includeKeyboard />
        </>
    );
}

const styles = StyleSheet.create({
    text: { flex: 1, gap: 2 },
});
