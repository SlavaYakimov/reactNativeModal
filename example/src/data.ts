export type Task = {
    id: string;
    title: string;
    status: string;
    tags: string[];
};

export const STATUSES = [
    { id: "todo", label: "To do" },
    { id: "progress", label: "In progress", description: "Someone is on it" },
    { id: "done", label: "Done" },
];

export const TAGS = [
    { id: "ui", label: "UI" },
    { id: "api", label: "API" },
    { id: "bug", label: "Bug" },
    { id: "docs", label: "Docs" },
];

export const INITIAL_TASKS: Task[] = [
    { id: "1", title: "Design the sheet header", status: "progress", tags: ["ui"] },
    { id: "2", title: "Wire the delete endpoint", status: "todo", tags: ["api"] },
    { id: "3", title: "Write the README", status: "done", tags: ["docs"] },
];

export function statusLabel(id: string) {
    return STATUSES.find((status) => status.id === id)?.label ?? id;
}

export function tagLabels(ids: string[]) {
    return ids.map((id) => TAGS.find((tag) => tag.id === id)?.label ?? id).join(", ");
}
