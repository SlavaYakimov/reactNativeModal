import type { ModalEntry, ModalStackState, OpenAfterCloseOptions, OpenRequest, Scheduler } from "./types";

const EMPTY_STACK: readonly ModalEntry[] = Object.freeze([]);

const EMPTY_STATE: ModalStackState = Object.freeze({
    stack: EMPTY_STACK,
    top: undefined,
    depth: 0,
    canGoBack: false,
});

/** Shell close animation (~250ms) + unmount fallback (~320ms) + keyboard settle (~100ms). */
export const DEFAULT_AFTER_CLOSE_MS = 450;

const timerScheduler: Scheduler = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type ModalControllerOptions = {
    scheduler?: Scheduler;
    afterCloseMs?: number;
};

export class ModalController {
    private state: ModalStackState = EMPTY_STATE;
    private readonly listeners = new Set<() => void>();
    private readonly scheduler: Scheduler;
    private readonly afterCloseMs: number;
    private nextId = 1;
    private pendingOpen: unknown = null;
    private pendingOwner: string | undefined;

    constructor(options: ModalControllerOptions = {}) {
        this.scheduler = options.scheduler ?? timerScheduler;
        this.afterCloseMs = options.afterCloseMs ?? DEFAULT_AFTER_CLOSE_MS;
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    /** Referentially stable between commits — safe for useSyncExternalStore. */
    getSnapshot = (): ModalStackState => this.state;

    get top(): ModalEntry | undefined {
        return this.state.top;
    }

    get depth(): number {
        return this.state.depth;
    }

    get canGoBack(): boolean {
        return this.state.canGoBack;
    }

    push = (request: OpenRequest): void => {
        this.cancelPendingOpen();
        this.commit([...this.state.stack, this.toEntry(request)]);
    };

    /** Replaces the top entry, or opens the first one when the stack is empty. */
    replace = (request: OpenRequest): void => {
        this.cancelPendingOpen();
        this.commit([...this.state.stack.slice(0, -1), this.toEntry(request)]);
    };

    pop = (): void => {
        if (this.state.depth === 0) {
            return;
        }
        this.commit(this.state.stack.slice(0, -1));
    };

    close = (): void => {
        this.cancelPendingOpen();
        if (this.state.depth === 0) {
            return;
        }
        this.commit(EMPTY_STACK);
    };

    /** Drops matching entries in one commit; no notification when nothing matched. */
    removeWhere = (predicate: (entry: ModalEntry) => boolean): void => {
        const rest = this.state.stack.filter((entry) => !predicate(entry));
        if (rest.length === this.state.depth) {
            return;
        }
        this.commit(rest);
    };

    /** Cancels a scheduled `openAfterClose`; with `owner`, only the one that owner scheduled. */
    cancelPending = (owner?: string): void => {
        if (owner !== undefined && owner !== this.pendingOwner) {
            return;
        }
        this.cancelPendingOpen();
    };

    /** Backdrop / swipe semantics: back when nested, close at the root. */
    dismiss = (): void => {
        if (this.state.canGoBack) {
            this.pop();
        } else {
            this.close();
        }
    };

    /** Close, wait for the shell to unmount, then open. Any later push/replace/close cancels it. */
    openAfterClose = (request: OpenRequest, options: OpenAfterCloseOptions = {}): void => {
        options.beforeClose?.();
        this.close();
        this.pendingOwner = options.owner;
        this.pendingOpen = this.scheduler.set(() => {
            this.pendingOpen = null;
            this.pendingOwner = undefined;
            this.push(request);
        }, options.delayMs ?? this.afterCloseMs);
    };

    private cancelPendingOpen(): void {
        if (this.pendingOpen == null) {
            return;
        }
        this.scheduler.clear(this.pendingOpen);
        this.pendingOpen = null;
        this.pendingOwner = undefined;
    }

    private toEntry(request: OpenRequest): ModalEntry {
        const entry: ModalEntry = request.layout
            ? { id: this.nextId++, name: request.name, payload: request.payload, layout: request.layout }
            : { id: this.nextId++, name: request.name, payload: request.payload };
        return Object.freeze(entry);
    }

    private commit(stack: readonly ModalEntry[]): void {
        const depth = stack.length;
        this.state = Object.freeze({
            stack: Object.freeze([...stack]),
            top: stack[depth - 1],
            depth,
            canGoBack: depth > 1,
        });
        this.listeners.forEach((listener) => listener());
    }
}

export function createModalController(options?: ModalControllerOptions): ModalController {
    return new ModalController(options);
}
