import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
    KitSheetShell,
    ModalKitProvider,
    type ModalKitThemeOverrides,
    useModalKitTheme,
} from "@slavayakimov/react-native-modal-stack/kit";
import { configureModals, useModalStackState } from "@slavayakimov/react-native-modal-stack/react";

import { DemoModals, useDemoDelete } from "./src/DemoModals";
import { INITIAL_TASKS, statusLabel, tagLabels, type Task } from "./src/data";

configureModals({ Shell: KitSheetShell });

const DARK: ModalKitThemeOverrides = {
    colors: {
        text: "#F4F4F6",
        muted: "#A0A0AB",
        border: "#3A3A44",
        surface: "#1E1E24",
        accent: "#7C5CFF",
        sheet: "#16161B",
        backdrop: "rgba(0, 0, 0, 0.7)",
    },
};

function StackBadge() {
    const { colors } = useModalKitTheme();
    const { depth, top } = useModalStackState();
    return (
        <Text testID="stack-badge" style={[styles.stack, { color: colors.muted }]}>
            Stack depth: {depth}
            {top ? ` · top: ${top.name}` : ""}
        </Text>
    );
}

function TaskCards({ tasks, onRestore }: { tasks: Task[]; onRestore: () => void }) {
    const { colors, radius } = useModalKitTheme();
    const { open } = DemoModals.useModal();

    if (tasks.length === 0) {
        return (
            <Pressable onPress={onRestore}>
                <Text style={{ color: colors.accent }}>All deleted — tap to restore</Text>
            </Pressable>
        );
    }

    return (
        <View style={styles.list}>
            {tasks.map((task) => (
                <Pressable
                    key={task.id}
                    testID={`task-${task.id}`}
                    onPress={() => open("actions", { taskId: task.id })}
                    style={[
                        styles.card,
                        { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{task.title}</Text>
                    <Text style={{ color: colors.muted }}>
                        {statusLabel(task.status)} · {tagLabels(task.tags) || "no tags"}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

function Playground({ dark, onToggleDark }: { dark: boolean; onToggleDark: (value: boolean) => void }) {
    const [tasks, setTasks] = useState(INITIAL_TASKS);
    const { onDelete, isDeleting } = useDemoDelete(setTasks);
    const background = dark ? "#121216" : "#EAF8FD";
    const text = dark ? "#F4F4F6" : "#1B1631";

    const update = useCallback((id: string, patch: Partial<Task>) => {
        setTasks((list) => list.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    }, []);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: text }]}>Modal stack playground</Text>
                    <View style={styles.toggle}>
                        <Text style={{ color: text }}>Dark</Text>
                        <Switch testID="dark-toggle" value={dark} onValueChange={onToggleDark} />
                    </View>
                </View>
                <Text style={[styles.hint, { color: text }]}>
                    Tap a task: the menu pushes the next step, the back arrow pops it, swipe or backdrop dismisses
                    one step at a time.
                </Text>
                <StackBadge />
                <TaskCards tasks={tasks} onRestore={() => setTasks(INITIAL_TASKS)} />
            </ScrollView>
            <DemoModals.Portal
                tasks={tasks}
                onSetStatus={(id, status) => update(id, { status })}
                onSetTags={(id, tags) => update(id, { tags })}
                onRename={(id, title) => update(id, { title })}
                onDelete={onDelete}
                isDeleting={isDeleting}
            />
        </SafeAreaView>
    );
}

export default function App() {
    const [dark, setDark] = useState(false);

    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaProvider>
                <ModalKitProvider theme={dark ? DARK : undefined}>
                    <Playground dark={dark} onToggleDark={setDark} />
                </ModalKitProvider>
            </SafeAreaProvider>
            <StatusBar style={dark ? "light" : "dark"} />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { padding: 20, gap: 12 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 22, fontWeight: "700" },
    toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
    hint: { fontSize: 14, opacity: 0.8 },
    stack: { fontSize: 13 },
    list: { gap: 12 },
    card: { borderWidth: 1, padding: 16, gap: 4 },
    cardTitle: { fontSize: 16, fontWeight: "600" },
});
