import type React from "react";
import { createContext, useContext, useMemo } from "react";

export type ModalKitColors = {
    /** Primary text. */
    text: string;
    /** Secondary text, hints, empty states. */
    muted: string;
    /** Row and control borders. */
    border: string;
    /** Row background. */
    surface: string;
    /** Primary button, selection mark, checked box. */
    accent: string;
    /** Text on top of `accent`. */
    onAccent: string;
    /** Destructive confirm button. */
    danger: string;
    /** Text on top of `danger`. */
    onDanger: string;
    /** Sheet background (used by `KitSheetShell`). */
    sheet: string;
    /** Dimmed backdrop behind the sheet. */
    backdrop: string;
};

export type ModalKitLabels = {
    select: string;
    cancel: string;
    confirm: string;
    empty: string;
};

export type ModalKitTheme = {
    colors: ModalKitColors;
    /** Corner radius of rows and buttons. */
    radius: number;
    /** Vertical gap between rows. */
    gap: number;
    fontSize: { title: number; body: number; caption: number };
    labels: ModalKitLabels;
};

export type ModalKitThemeOverrides = {
    colors?: Partial<ModalKitColors>;
    radius?: number;
    gap?: number;
    fontSize?: Partial<ModalKitTheme["fontSize"]>;
    labels?: Partial<ModalKitLabels>;
};

export const defaultModalKitTheme: ModalKitTheme = {
    colors: {
        text: "#1B1631",
        muted: "#787884",
        border: "#C9CACC",
        surface: "#FFFFFF",
        accent: "#05C0E6",
        onAccent: "#FFFFFF",
        danger: "#E5484D",
        onDanger: "#FFFFFF",
        sheet: "#FFFFFF",
        backdrop: "rgba(0, 0, 0, 0.5)",
    },
    radius: 16,
    gap: 12,
    fontSize: { title: 18, body: 16, caption: 14 },
    labels: { select: "Select", cancel: "Cancel", confirm: "Confirm", empty: "Nothing here yet" },
};

export function mergeModalKitTheme(base: ModalKitTheme, overrides: ModalKitThemeOverrides = {}): ModalKitTheme {
    return {
        colors: { ...base.colors, ...overrides.colors },
        radius: overrides.radius ?? base.radius,
        gap: overrides.gap ?? base.gap,
        fontSize: { ...base.fontSize, ...overrides.fontSize },
        labels: { ...base.labels, ...overrides.labels },
    };
}

const ModalKitThemeContext = createContext<ModalKitTheme>(defaultModalKitTheme);

export type ModalKitProviderProps = {
    /** Partial overrides on top of the parent theme (or the default one). */
    theme?: ModalKitThemeOverrides;
    children: React.ReactNode;
};

/** Theme and default labels for kit sheets. Nest providers to override a subtree. */
export function ModalKitProvider({ theme, children }: ModalKitProviderProps) {
    const parent = useContext(ModalKitThemeContext);
    const value = useMemo(() => mergeModalKitTheme(parent, theme), [parent, theme]);
    return <ModalKitThemeContext.Provider value={value}>{children}</ModalKitThemeContext.Provider>;
}

export function useModalKitTheme(): ModalKitTheme {
    return useContext(ModalKitThemeContext);
}
