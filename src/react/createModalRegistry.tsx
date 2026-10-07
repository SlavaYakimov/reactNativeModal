import { type ComponentType, type ReactNode, useCallback, useMemo, useState } from "react";

import type { ModalController, ModalEntry, ModalLayout, OpenRequest } from "../core";
import { ModalDismissProvider, useModalDismissRequest } from "./ModalDismissContext";
import { type ModalShellComponent, type ModalShellProps, useModalEnv, useModalStackState } from "./ModalProvider";

export type ModalNav = {
    back: () => void;
    close: () => void;
    dismiss: () => void;
    canGoBack: boolean;
    depth: number;
};

export type ModalRenderProps<Ctx, P> = {
    ctx: Ctx;
    payload: P;
    nav: ModalNav;
    /** Registry-local key of the rendered entry. */
    name: string;
};

export type ModalDef<Ctx, P> = {
    layout?: ModalLayout;
    /** i18n key — translated by the configured `translate`. */
    title?: string;
    render: (props: ModalRenderProps<Ctx, P>) => ReactNode;
    /** Type-only marker so the payload type survives `build()`. */
    readonly __payload?: P;
};

type AnyDefs<Ctx> = Record<string, ModalDef<Ctx, any>>;

/** Defs written without `m.def<P>()` carry no payload. */
export type PayloadOf<T> = T extends { readonly __payload?: infer P } ? (unknown extends P ? void : P) : void;

type Key<D> = Extract<keyof D, string>;

export type OpenArgs<P> = [P] extends [void] ? [payload?: undefined] : [payload: P];

export type ModalActions<D> = {
    /** Replace the top entry (opens the first one on an empty stack). */
    open: <K extends Key<D>>(name: K, ...args: OpenArgs<PayloadOf<D[K]>>) => void;
    push: <K extends Key<D>>(name: K, ...args: OpenArgs<PayloadOf<D[K]>>) => void;
    /** Close, wait for the shell to unmount, then open — for cross-registry hops. */
    openAfterClose: <K extends Key<D>>(name: K, ...args: OpenArgs<PayloadOf<D[K]>>) => void;
    back: () => void;
    close: () => void;
};

export type ModalRegistry<Ctx, D> = {
    namespace: string;
    keys: ReadonlyArray<Key<D>>;
    Portal: ComponentType<Ctx>;
    useModal: () => ModalActions<D>;
    request: <K extends Key<D>>(name: K, ...args: OpenArgs<PayloadOf<D[K]>>) => OpenRequest;
    owns: (entry: ModalEntry | undefined) => boolean;
};

export type ModalRegistryOptions = {
    /** Overrides the configured Shell for this registry only. */
    Shell?: ModalShellComponent;
};

type Shown<Ctx> = { entry: ModalEntry; def: ModalDef<Ctx, unknown>; name: string };

const noop = () => undefined;

// React Native defines `__DEV__`; plain React builds may not.
declare const __DEV__: boolean | undefined;
const isDev = () => typeof __DEV__ === "undefined" || __DEV__;

const warnedMissingShell = new Set<string>();
const registeredKeys = new Map<string, string>();

/** HMR rebuilds a module with the same keys — only a different key set means a real clash. */
function checkNamespace(namespace: string, keys: string[]) {
    if (!namespace || !isDev()) {
        return;
    }
    const signature = [...keys].sort((x, y) => (x < y ? -1 : 1)).join(",");
    const known = registeredKeys.get(namespace);
    if (known !== undefined && known !== signature) {
        console.error(
            `[modal-stack] Namespace "${namespace}" is registered twice with different keys: [${known}] and [${signature}]`,
        );
    }
    registeredKeys.set(namespace, signature);
}

function ShellBridge({ Shell, ...props }: Omit<ModalShellProps, "onDismiss"> & { Shell: ModalShellComponent }) {
    const requestDismiss = useModalDismissRequest();
    return <Shell {...props} onDismiss={requestDismiss ?? noop} />;
}

function ModalBody<Ctx>({ def, entry, name, ctx, nav }: Shown<Ctx> & { ctx: Ctx; nav: ModalNav }) {
    return <>{def.render({ ctx, payload: entry.payload, nav, name })}</>;
}

export function createModalRegistry<Ctx extends object>(namespace: string, options: ModalRegistryOptions = {}) {
    const prefix = namespace ? `${namespace}/` : "";
    const qualify = (key: string) => `${prefix}${key}`;
    const unqualify = (name: string) => (name.startsWith(prefix) ? name.slice(prefix.length) : undefined);

    return {
        def<P = void>(def: ModalDef<Ctx, P>): ModalDef<Ctx, P> {
            return def;
        },

        build<D extends AnyDefs<Ctx>>(defs: D): ModalRegistry<Ctx, D> {
            checkNamespace(namespace, Object.keys(defs));
            const resolve = (entry: ModalEntry | undefined): Shown<Ctx> | undefined => {
                if (!entry) {
                    return undefined;
                }
                const key = unqualify(entry.name);
                if (key == null || !Object.prototype.hasOwnProperty.call(defs, key)) {
                    return undefined;
                }
                return { entry, def: defs[key], name: key };
            };

            const toRequest = (name: string, payload?: unknown): OpenRequest => {
                const layout = defs[name]?.layout;
                return layout ? { name: qualify(name), payload, layout } : { name: qualify(name), payload };
            };

            const owns = (entry: ModalEntry | undefined) => resolve(entry) != null;

            function Portal(ctx: Ctx) {
                const { controller, Shell: EnvShell, translate, screen } = useModalEnv();
                const Shell = options.Shell ?? EnvShell;
                const state = useModalStackState();
                const isActive = screen.useIsActive();
                const current = isActive ? resolve(state.top) : undefined;

                const [shown, setShown] = useState<Shown<Ctx> | null>(null);
                if (current && shown?.entry !== current.entry) {
                    setShown(current);
                }

                const closeOwned = useCallback(() => {
                    if (namespace) {
                        controller.cancelPending(namespace);
                    }
                    controller.removeWhere(owns);
                }, [controller]);
                screen.useOnLeave(closeOwned);

                const nav = useMemo<ModalNav>(
                    () => ({
                        back: controller.pop,
                        close: controller.close,
                        dismiss: controller.dismiss,
                        canGoBack: state.canGoBack,
                        depth: state.depth,
                    }),
                    [controller, state.canGoBack, state.depth],
                );

                if (!Shell) {
                    const label = namespace || "legacy";
                    if (!warnedMissingShell.has(label)) {
                        warnedMissingShell.add(label);
                        console.warn(
                            `[modal-stack] No Shell configured for "${label}" — call configureModals({ Shell }) or mount ModalProvider`,
                        );
                    }
                    return null;
                }
                if (!shown) {
                    return null;
                }

                const visible = current != null;
                const title = shown.def.title ? translate(shown.def.title) : undefined;

                return (
                    <ModalDismissProvider onDismiss={controller.dismiss}>
                        <ShellBridge
                            Shell={Shell}
                            visible={visible}
                            layout={shown.entry.layout ?? shown.def.layout ?? "fit"}
                            title={title}
                            canGoBack={visible && state.canGoBack}
                            onBack={controller.pop}
                        >
                            <ModalBody key={shown.entry.id} {...shown} ctx={ctx} nav={nav} />
                        </ShellBridge>
                    </ModalDismissProvider>
                );
            }

            const toActions = (controller: ModalController, beforeReopen?: () => void) =>
                ({
                    open: (name: string, payload?: unknown) => controller.replace(toRequest(name, payload)),
                    push: (name: string, payload?: unknown) => controller.push(toRequest(name, payload)),
                    openAfterClose: (name: string, payload?: unknown) =>
                        controller.openAfterClose(toRequest(name, payload), {
                            beforeClose: beforeReopen,
                            owner: namespace || undefined,
                        }),
                    back: controller.pop,
                    close: controller.close,
                }) as ModalActions<D>;

            function useModal(): ModalActions<D> {
                const { controller, beforeReopen } = useModalEnv();
                return useMemo(() => toActions(controller, beforeReopen), [controller, beforeReopen]);
            }

            return {
                namespace,
                keys: Object.keys(defs) as Array<Key<D>>,
                Portal,
                useModal,
                request: ((name: string, payload?: unknown) => toRequest(name, payload)) as ModalRegistry<
                    Ctx,
                    D
                >["request"],
                owns,
            };
        },
    };
}
