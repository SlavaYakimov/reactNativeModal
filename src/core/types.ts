export type ModalLayout = "fit" | "form" | "scroll";

export type ModalEntry = {
    readonly id: number;
    readonly name: string;
    readonly payload: unknown;
    readonly layout?: ModalLayout;
};

export type ModalStackState = {
    readonly stack: readonly ModalEntry[];
    readonly top: ModalEntry | undefined;
    readonly depth: number;
    readonly canGoBack: boolean;
};

export type OpenRequest = {
    name: string;
    payload?: unknown;
    layout?: ModalLayout;
};

export type OpenAfterCloseOptions = {
    delayMs?: number;
    beforeClose?: () => void;
    /** Registry namespace that scheduled the open — lets `cancelPending(owner)` drop it on screen leave. */
    owner?: string;
};

export type Scheduler = {
    set: (fn: () => void, ms: number) => unknown;
    clear: (handle: unknown) => void;
};

export interface ExternalStore<T> {
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => T;
}

export type KeyboardSnapshot = {
    height: number;
    duration: number;
};

export type KeyboardGeometry = {
    isOpen: boolean;
    /** Last show — height is kept after close (FooterContent animates from it). */
    open: KeyboardSnapshot;
    /** Last hide — height is always 0. */
    closed: KeyboardSnapshot;
    /** open.height while open, else 0. */
    height: number;
    /** Duration of the active / last transition. */
    duration: number;
};

export interface KeyboardSource extends ExternalStore<KeyboardGeometry> {
    start: () => void;
    stop: () => void;
}
