import type React from "react";
import { View } from "react-native";

/**
 * Bare box (`layout: "scroll"`) — no padding/gap so legacy children keep their own styles.
 * Fills shell maxHeight so FlatList can scroll.
 */
export function BareBox({ children }: { children: React.ReactNode }) {
    return <View style={{ flex: 1 }}>{children}</View>;
}
