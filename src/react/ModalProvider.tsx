import { type ComponentType, createContext, type ReactNode, useContext, useMemo, useSyncExternalStore } from "react";

import { ModalController, type ModalLayout, type ModalStackState } from "../core";

export type ModalShellProps = {
    visible: boolean;
    layout: ModalLayout;
    /** Already translated. */
    title?: string;
    canGoBack: boolean;
    onDismiss: () => void;
    onBack: () => void;
    leftContent?: ReactNode;
    rightContent?: ReactNode;
    children: ReactNode;
};

export type ModalShellComponent = ComponentType<ModalShellProps>;

/** Hooks must keep a stable identity for the app lifetime. */
export type ModalScreenAdapter = {
    useIsActive: () => boolean;
    useOnLeave: (onLeave: () => void) => void;
};

export type ModalEnv = {
    controller: ModalController;
    Shell?: ModalShellComponent;
    translate: (key: string) => string;
    screen: ModalScreenAdapter;
    beforeReopen?: () => void;
};

const alwaysActiveScreen: ModalScreenAdapter = {
    useIsActive: () => true,
    useOnLeave: () => undefined,
};

const identity = (key: string) => key;

const defaultController = new ModalController();

let globalEnv: ModalEnv = {
    controller: defaultController,
    translate: identity,
    screen: alwaysActiveScreen,
};

/** For non-React callers (mutation callbacks, services). */
export function getDefaultModalController(): ModalController {
    return defaultController;
}

/**
 * App-wide defaults used when no ModalProvider is mounted (fixtures, root screens).
 * Call once at module init, before the first Portal renders.
 */
export function configureModals(config: Partial<Omit<ModalEnv, "controller">>): void {
    globalEnv = { ...globalEnv, ...config };
}

const ModalEnvContext = createContext<ModalEnv | null>(null);

export type ModalProviderProps = Partial<ModalEnv> & {
    children: ReactNode;
};

/** Scoped override: own controller (isolated flow / fixture) or own Shell for a subtree. */
export function ModalProvider({ controller, Shell, translate, screen, beforeReopen, children }: ModalProviderProps) {
    const parent = useModalEnv();
    const value = useMemo<ModalEnv>(
        () => ({
            controller: controller ?? parent.controller,
            Shell: Shell ?? parent.Shell,
            translate: translate ?? parent.translate,
            screen: screen ?? parent.screen,
            beforeReopen: beforeReopen ?? parent.beforeReopen,
        }),
        [controller, Shell, translate, screen, beforeReopen, parent],
    );
    return <ModalEnvContext.Provider value={value}>{children}</ModalEnvContext.Provider>;
}

export function useModalEnv(): ModalEnv {
    return useContext(ModalEnvContext) ?? globalEnv;
}

export function useModalController(): ModalController {
    return useModalEnv().controller;
}

export function useModalStackState(): ModalStackState {
    const controller = useModalController();
    return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}
