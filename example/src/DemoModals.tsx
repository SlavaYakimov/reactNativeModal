import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import {
    ActionMenuSheet,
    CheckboxListSheet,
    ConfirmSheet,
    KitButton,
    OptionListSheet,
    useModalKitTheme,
} from "@slavayakimov/react-native-modal-stack/kit";
import { createModalRegistry, useModalDraft } from "@slavayakimov/react-native-modal-stack/react";
import { FooterContent } from "@slavayakimov/react-native-modal-stack/react-native";

import { STATUSES, TAGS, type Task } from "./data";

/** Long-lived screen state: lists, handlers, pending flags. */
export type DemoModalContext = {
    tasks: Task[];
    onSetStatus: (id: string, status: string) => void;
    onSetTags: (id: string, tags: string[]) => void;
    onRename: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
};

/** One-off payload of a step: which task the sheet is about. */
type Target = { taskId: string };

const m = createModalRegistry<DemoModalContext>("demo");

function findTask(ctx: DemoModalContext, target: Target) {
    return ctx.tasks.find((task) => task.id === target.taskId);
}

function TaskActions({ ctx, target }: { ctx: DemoModalContext; target: Target }) {
    const { push } = DemoModals.useModal();
    const task = findTask(ctx, target);

    return (
        <ActionMenuSheet
            title={task?.title ?? "Task"}
            items={[
                { key: "status", label: "Change status", onPress: () => push("status", target) },
                { key: "tags", label: "Edit tags", onPress: () => push("tags", target) },
                { key: "rename", label: "Rename", onPress: () => push("rename", target) },
                { key: "delete", label: "Delete", destructive: true, onPress: () => push("deleteConfirm", target) },
            ]}
        />
    );
}

function RenameForm({ ctx, target }: { ctx: DemoModalContext; target: Target }) {
    const { colors, radius, fontSize } = useModalKitTheme();
    const task = findTask(ctx, target);
    const { draft, setDraft, success } = useModalDraft({
        initial: task?.title ?? "",
        onCommit: (title) => ctx.onRename(target.taskId, title.trim()),
    });

    return (
        <>
            <TextInput
                testID="rename-input"
                value={draft}
                onChangeText={setDraft}
                autoFocus
                placeholder="Title"
                placeholderTextColor={colors.muted}
                style={[
                    styles.input,
                    { borderColor: colors.border, borderRadius: radius, color: colors.text, fontSize: fontSize.body },
                ]}
            />
            <FooterContent includeKeyboard>
                <KitButton label="Save" onPress={success} disabled={draft.trim().length === 0} style={styles.save} />
            </FooterContent>
        </>
    );
}

export const DemoModals = m.build({
    actions: m.def<Target>({
        layout: "fit",
        render: ({ ctx, payload }) => <TaskActions ctx={ctx} target={payload} />,
    }),
    status: m.def<Target>({
        layout: "fit",
        title: "Status",
        render: ({ ctx, payload, nav }) => (
            <OptionListSheet
                items={STATUSES}
                selectedId={findTask(ctx, payload)?.status}
                onSelect={(item) => {
                    ctx.onSetStatus(payload.taskId, String(item.id));
                    nav.close();
                }}
            />
        ),
    }),
    tags: m.def<Target>({
        layout: "fit",
        title: "Tags",
        render: ({ ctx, payload }) => (
            <CheckboxListSheet
                items={TAGS}
                initialSelectedIds={findTask(ctx, payload)?.tags ?? []}
                onConfirm={(ids) => ctx.onSetTags(payload.taskId, ids.map(String))}
            />
        ),
    }),
    rename: m.def<Target>({
        layout: "fit",
        title: "Rename task",
        render: ({ ctx, payload }) => <RenameForm ctx={ctx} target={payload} />,
    }),
    deleteConfirm: m.def<Target>({
        layout: "fit",
        title: "Delete task?",
        render: ({ ctx, payload, nav }) => (
            <ConfirmSheet
                description="The task disappears from the list. This demo has no undo."
                confirmLabel="Delete"
                destructive
                isLoading={ctx.isDeleting}
                onCancel={nav.canGoBack ? nav.back : nav.close}
                onConfirm={() => ctx.onDelete(payload.taskId)}
            />
        ),
    }),
});

/** Async delete: the sheet stays open with a spinner and closes when the "request" resolves. */
export function useDemoDelete(setTasks: (update: (tasks: Task[]) => Task[]) => void) {
    const { close } = DemoModals.useModal();
    const [isDeleting, setIsDeleting] = useState(false);

    const onDelete = (id: string) => {
        setIsDeleting(true);
        setTimeout(() => {
            setTasks((tasks) => tasks.filter((task) => task.id !== id));
            setIsDeleting(false);
            close();
        }, 800);
    };

    return { onDelete, isDeleting };
}

const styles = StyleSheet.create({
    input: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
    save: { marginTop: 16 },
});
