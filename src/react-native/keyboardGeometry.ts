import { useSyncExternalStore } from "react";
import { Keyboard, type KeyboardEvent, Platform } from "react-native";

import type { KeyboardGeometry, KeyboardSnapshot, KeyboardSource } from "../core";

const DEFAULT_KEYBOARD_DURATION = 250;

const EMPTY_SNAPSHOT: KeyboardSnapshot = {
    height: 0,
    duration: DEFAULT_KEYBOARD_DURATION,
};

function resolveDuration(event?: KeyboardEvent) {
    return event?.duration && event.duration > 0 ? event.duration : DEFAULT_KEYBOARD_DURATION;
}

function toGeometry(isOpen: boolean, open: KeyboardSnapshot, closed: KeyboardSnapshot): KeyboardGeometry {
    return {
        isOpen,
        open,
        closed,
        height: isOpen ? open.height : 0,
        duration: isOpen ? open.duration : closed.duration,
    };
}

/**
 * App-wide keyboard geometry — one native subscription, many readers.
 * Start once (App root), then only read.
 */
export class KeyboardGeometryService implements KeyboardSource {
    private open: KeyboardSnapshot = EMPTY_SNAPSHOT;
    private closed: KeyboardSnapshot = EMPTY_SNAPSHOT;
    private isOpen = false;
    private listeners = new Set<() => void>();
    private showSub: { remove: () => void } | null = null;
    private hideSub: { remove: () => void } | null = null;
    private snapshot: KeyboardGeometry = toGeometry(false, EMPTY_SNAPSHOT, EMPTY_SNAPSHOT);

    /** Ensure native listeners are attached (idempotent). */
    start = () => {
        if (this.showSub) {
            return;
        }

        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        this.showSub = Keyboard.addListener(showEvent, (e) => {
            this.open = {
                height: e.endCoordinates.height,
                duration: resolveDuration(e),
            };
            this.isOpen = true;
            this.emit();
        });

        this.hideSub = Keyboard.addListener(hideEvent, (e) => {
            this.closed = {
                height: 0,
                duration: resolveDuration(e),
            };
            this.isOpen = false;
            this.emit();
        });
    };

    stop = () => {
        this.showSub?.remove();
        this.hideSub?.remove();
        this.showSub = null;
        this.hideSub = null;
    };

    getSnapshot = (): KeyboardGeometry => this.snapshot;

    subscribe = (listener: () => void) => {
        this.start();
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    private emit() {
        this.snapshot = toGeometry(this.isOpen, this.open, this.closed);
        this.listeners.forEach((listener) => listener());
    }
}

export const KeyboardGeometryStore = new KeyboardGeometryService();

export function useKeyboardGeometry(): KeyboardGeometry {
    return useSyncExternalStore(
        KeyboardGeometryStore.subscribe,
        KeyboardGeometryStore.getSnapshot,
        KeyboardGeometryStore.getSnapshot,
    );
}
