import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";

/**
 * Optional interceptor for backdrop / pan-dismiss.
 * Return `true` to consume (nested view → go back). `false` → default dismiss.
 */
export type ModalDismissHandler = () => boolean;

type RegisterFn = (handler: ModalDismissHandler | null) => void;

const RegisterContext = createContext<RegisterFn | null>(null);
const RequestContext = createContext<(() => void) | null>(null);

/** Wraps a sheet so its body can intercept dismiss via {@link useModalDismissHandler}. */
export function ModalDismissProvider({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
    const handlerRef = useRef<ModalDismissHandler | null>(null);

    const setHandler = useCallback((handler: ModalDismissHandler | null) => {
        handlerRef.current = handler;
    }, []);

    const requestDismiss = useCallback(() => {
        if (handlerRef.current?.()) {
            return;
        }
        onDismiss();
    }, [onDismiss]);

    return (
        <RegisterContext.Provider value={setHandler}>
            <RequestContext.Provider value={requestDismiss}>{children}</RequestContext.Provider>
        </RegisterContext.Provider>
    );
}

/** Shell reads this to wire backdrop + pan. */
export function useModalDismissRequest() {
    return useContext(RequestContext);
}

/** While `enabled`, intercept dismiss. Handler returns true = stay open. */
export function useModalDismissHandler(handler: ModalDismissHandler, enabled: boolean) {
    const register = useContext(RegisterContext);
    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        if (!register) {
            return;
        }
        if (!enabled) {
            register(null);
            return;
        }
        register(() => handlerRef.current());
        return () => register(null);
    }, [register, enabled]);
}
