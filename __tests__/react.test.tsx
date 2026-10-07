import { createModalController } from "@slavayakimov/react-native-modal-stack/core";
import {
    createModalRegistry,
    type ModalNav,
    ModalProvider,
    type ModalScreenAdapter,
    type ModalShellProps,
} from "@slavayakimov/react-native-modal-stack/react";
import type React from "react";
import { act, useEffect } from "react";
import TestRenderer from "react-test-renderer";

type Ctx = { label: string };

const shells: ModalShellProps[] = [];
function TestShell(props: ModalShellProps) {
    shells.push(props);
    return <>{props.children}</>;
}
const lastShell = () => shells[shells.length - 1];

const mounts: string[] = [];
const seen: Array<{ name: string; payload: unknown; ctx: Ctx; nav: ModalNav }> = [];

function Body({ name, payload, ctx, nav }: { name: string; payload: unknown; ctx: Ctx; nav: ModalNav }) {
    seen.push({ name, payload, ctx, nav });
    useEffect(() => {
        mounts.push(name);
    }, [name]);
    return null;
}

const a = createModalRegistry<Ctx>("a");
const A = a.build({
    menu: a.def({ layout: "fit", title: "menu_title", render: (p) => <Body {...p} /> }),
    edit: a.def<{ id: number }>({ layout: "form", render: (p) => <Body {...p} /> }),
});

const b = createModalRegistry<Ctx>("b");
const B = b.build({
    menu: b.def({ render: (p) => <Body {...p} /> }),
});

function screenAdapter(initial: boolean) {
    const state = { active: initial, onLeave: undefined as undefined | (() => void) };
    const adapter: ModalScreenAdapter = {
        useIsActive: () => state.active,
        useOnLeave: (onLeave) => {
            state.onLeave = onLeave;
        },
    };
    return { state, adapter };
}

function mount(children: React.ReactNode, screen = screenAdapter(true)) {
    const controller = createModalController();
    let renderer!: TestRenderer.ReactTestRenderer;
    const tree = () => (
        <ModalProvider
            controller={controller}
            Shell={TestShell}
            translate={(key) => `t:${key}`}
            screen={screen.adapter}
        >
            {children}
        </ModalProvider>
    );
    act(() => {
        renderer = TestRenderer.create(tree());
    });
    return {
        controller,
        screen,
        rerender: () => act(() => renderer.update(tree())),
        unmount: () => act(() => renderer.unmount()),
    };
}

beforeEach(() => {
    shells.length = 0;
    mounts.length = 0;
    seen.length = 0;
});

describe("createModalRegistry", () => {
    it("qualifies names with the namespace and keeps the def layout", () => {
        expect(A.request("menu")).toEqual({ name: "a/menu", payload: undefined, layout: "fit" });
        expect(B.request("menu")).toEqual({ name: "b/menu", payload: undefined });
        expect(A.keys).toEqual(["menu", "edit"]);
    });

    it("owns only its own entries", () => {
        expect(A.owns({ id: 1, name: "a/menu", payload: undefined })).toBe(true);
        expect(A.owns({ id: 1, name: "b/menu", payload: undefined })).toBe(false);
        expect(A.owns({ id: 1, name: "a/unknown", payload: undefined })).toBe(false);
        expect(A.owns(undefined)).toBe(false);
    });

    it("renders nothing until an owned entry is on top", () => {
        const { controller } = mount(<A.Portal label="x" />);
        expect(shells).toHaveLength(0);

        act(() => controller.push(B.request("menu")));
        expect(shells).toHaveLength(0);
        expect(seen).toHaveLength(0);
    });

    it("renders the top entry with ctx, payload, translated title and layout", () => {
        const { controller } = mount(<A.Portal label="ctx" />);
        act(() => controller.push(A.request("menu")));
        expect(lastShell()).toMatchObject({ visible: true, layout: "fit", title: "t:menu_title", canGoBack: false });
        expect(seen.at(-1)).toMatchObject({ name: "menu", ctx: { label: "ctx" } });

        act(() => controller.push(A.request("edit", { id: 7 })));
        expect(lastShell()).toMatchObject({ visible: true, layout: "form", title: undefined, canGoBack: true });
        expect(seen.at(-1)).toMatchObject({ name: "edit", payload: { id: 7 } });
        expect(seen.at(-1)?.nav).toMatchObject({ canGoBack: true, depth: 2 });
    });

    it("two registries on one screen: only the owner of the top renders it", () => {
        const { controller } = mount(
            <>
                <A.Portal label="a" />
                <B.Portal label="b" />
            </>,
        );
        act(() => controller.push(B.request("menu")));
        expect(seen.map((s) => s.ctx.label)).toEqual(["b"]);
    });

    it("keeps the last entry mounted but invisible while closing", () => {
        const { controller } = mount(<A.Portal label="x" />);
        act(() => controller.push(A.request("menu")));
        act(() => controller.close());
        expect(lastShell().visible).toBe(false);
        expect(seen.at(-1)?.name).toBe("menu");
    });

    it("does not render while the screen is inactive", () => {
        const screen = screenAdapter(false);
        const { controller, rerender } = mount(<A.Portal label="x" />, screen);
        act(() => controller.push(A.request("menu")));
        expect(shells).toHaveLength(0);

        screen.state.active = true;
        rerender();
        expect(lastShell().visible).toBe(true);
    });

    it("closes owned entries when the screen is left, ignores foreign ones", () => {
        const screen = screenAdapter(true);
        const { controller } = mount(<A.Portal label="x" />, screen);

        act(() => controller.push(B.request("menu")));
        act(() => screen.state.onLeave?.());
        expect(controller.depth).toBe(1);

        act(() => controller.replace(A.request("menu")));
        act(() => screen.state.onLeave?.());
        expect(controller.depth).toBe(0);
    });

    it("shell dismiss pops at depth 2 and closes at depth 1", () => {
        const { controller } = mount(<A.Portal label="x" />);
        act(() => controller.push(A.request("menu")));
        act(() => controller.push(A.request("edit", { id: 1 })));

        act(() => lastShell().onDismiss());
        expect(controller.top?.name).toBe("a/menu");

        act(() => lastShell().onDismiss());
        expect(controller.depth).toBe(0);
    });

    it("shell back pops", () => {
        const { controller } = mount(<A.Portal label="x" />);
        act(() => controller.push(A.request("menu")));
        act(() => controller.push(A.request("edit", { id: 1 })));
        act(() => lastShell().onBack());
        expect(controller.top?.name).toBe("a/menu");
    });

    it("remounts the body for every new entry, even with the same name", () => {
        const { controller } = mount(<A.Portal label="x" />);
        act(() => controller.replace(A.request("edit", { id: 1 })));
        act(() => controller.replace(A.request("edit", { id: 2 })));
        expect(mounts).toEqual(["edit", "edit"]);
    });

    it("useModal actions resolve to qualified names", () => {
        const onActions = jest.fn<void, [ReturnType<typeof A.useModal>]>();
        function Harness() {
            const actions = A.useModal();
            useEffect(() => onActions(actions), [actions]);
            return null;
        }
        const { controller } = mount(<Harness />);
        const actions = onActions.mock.calls[0][0];

        act(() => actions.open("menu"));
        act(() => actions.push("edit", { id: 3 }));
        expect(controller.getSnapshot().stack.map((e) => e.name)).toEqual(["a/menu", "a/edit"]);
        act(() => actions.back());
        expect(controller.depth).toBe(1);
        act(() => actions.close());
        expect(controller.depth).toBe(0);
    });

    it("warns once and renders nothing when no Shell is configured", () => {
        const controller = createModalController();
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const NoShell = createModalRegistry<Ctx>("noshell").build({
            menu: { render: () => "body" },
        });
        controller.push(NoShell.request("menu"));
        let renderer!: TestRenderer.ReactTestRenderer;
        act(() => {
            renderer = TestRenderer.create(
                <ModalProvider controller={controller}>
                    <NoShell.Portal label="x" />
                    <NoShell.Portal label="y" />
                </ModalProvider>,
            );
        });
        expect(renderer.toJSON()).toBeNull();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toMatch(/No Shell configured for "noshell"/);
        warn.mockRestore();
    });

    it("warns in dev when a namespace is rebuilt with different keys", () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const first = createModalRegistry<Ctx>("dupe");
        first.build({ one: first.def({ render: () => null }) });
        first.build({ one: first.def({ render: () => null }) });
        expect(error).not.toHaveBeenCalled();

        const second = createModalRegistry<Ctx>("dupe");
        second.build({ other: second.def({ render: () => null }) });
        expect(error).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0][0]).toMatch(/Namespace "dupe" is registered twice/);
        error.mockRestore();
    });

    it("leaving the screen keeps foreign entries under the owned ones", () => {
        const screen = screenAdapter(true);
        const { controller } = mount(<A.Portal label="x" />, screen);
        act(() => controller.push(B.request("menu")));
        act(() => controller.push(A.request("menu")));
        act(() => screen.state.onLeave?.());
        expect(controller.getSnapshot().stack.map((e) => e.name)).toEqual(["b/menu"]);
    });

    it("leaving the screen cancels this registry's pending openAfterClose only", () => {
        jest.useFakeTimers();
        try {
            const screen = screenAdapter(true);
            const { controller } = mount(<A.Portal label="x" />, screen);
            act(() => controller.openAfterClose(A.request("menu"), { owner: "a" }));
            act(() => screen.state.onLeave?.());
            act(() => jest.runAllTimers());
            expect(controller.depth).toBe(0);

            act(() => controller.openAfterClose(B.request("menu"), { owner: "b" }));
            act(() => screen.state.onLeave?.());
            act(() => jest.runAllTimers());
            expect(controller.top?.name).toBe("b/menu");
        } finally {
            jest.useRealTimers();
        }
    });

    it("useModal().openAfterClose tags the pending open with the namespace", () => {
        jest.useFakeTimers();
        try {
            const onActions = jest.fn<void, [ReturnType<typeof A.useModal>]>();
            function Harness() {
                const value = A.useModal();
                useEffect(() => onActions(value), [value]);
                return null;
            }
            const { controller } = mount(<Harness />);
            const actions = onActions.mock.calls[0][0];
            act(() => actions.openAfterClose("menu"));
            act(() => controller.cancelPending("b"));
            act(() => controller.cancelPending("a"));
            act(() => jest.runAllTimers());
            expect(controller.depth).toBe(0);
        } finally {
            jest.useRealTimers();
        }
    });
});
