import { createModalController, type Scheduler } from "@slavayakimov/react-native-modal-stack/core";

function manualScheduler() {
    const tasks = new Map<number, () => void>();
    let next = 1;
    const scheduler: Scheduler = {
        set: (fn) => {
            const id = next++;
            tasks.set(id, fn);
            return id;
        },
        clear: (handle) => {
            tasks.delete(handle as number);
        },
    };
    const flush = () => {
        const pending = [...tasks.values()];
        tasks.clear();
        pending.forEach((fn) => fn());
    };
    return { scheduler, flush, pending: () => tasks.size };
}

const names = (c: ReturnType<typeof createModalController>) => c.getSnapshot().stack.map((e) => e.name);

describe("ModalController (core)", () => {
    it("starts empty", () => {
        const c = createModalController();
        expect(c.getSnapshot()).toEqual({ stack: [], top: undefined, depth: 0, canGoBack: false });
    });

    it("push builds history, pop walks it back", () => {
        const c = createModalController();
        c.push({ name: "a" });
        c.push({ name: "b" });
        expect(names(c)).toEqual(["a", "b"]);
        expect(c.canGoBack).toBe(true);
        expect(c.top?.name).toBe("b");

        c.pop();
        expect(names(c)).toEqual(["a"]);
        expect(c.canGoBack).toBe(false);
        c.pop();
        expect(c.depth).toBe(0);
    });

    it("replace swaps only the top entry and opens on an empty stack", () => {
        const c = createModalController();
        c.replace({ name: "a" });
        expect(names(c)).toEqual(["a"]);
        c.push({ name: "b" });
        c.replace({ name: "c" });
        expect(names(c)).toEqual(["a", "c"]);
    });

    it("close clears the whole stack", () => {
        const c = createModalController();
        c.push({ name: "a" });
        c.push({ name: "b" });
        c.close();
        expect(c.depth).toBe(0);
    });

    it("dismiss pops when nested and closes at the root", () => {
        const c = createModalController();
        c.push({ name: "a" });
        c.push({ name: "b" });
        c.dismiss();
        expect(names(c)).toEqual(["a"]);
        c.dismiss();
        expect(c.depth).toBe(0);
    });

    it("assigns a fresh id to every entry, even for the same name", () => {
        const c = createModalController();
        c.replace({ name: "a" });
        const first = c.top?.id;
        c.replace({ name: "a" });
        expect(c.top?.id).not.toBe(first);
    });

    it("keeps payload and explicit layout on the entry", () => {
        const c = createModalController();
        c.push({ name: "a", payload: { x: 1 }, layout: "form" });
        expect(c.top).toMatchObject({ name: "a", payload: { x: 1 }, layout: "form" });
        c.push({ name: "b" });
        expect(c.top && "layout" in c.top).toBe(false);
    });

    it("snapshot is referentially stable between commits and frozen", () => {
        const c = createModalController();
        const empty = c.getSnapshot();
        expect(c.getSnapshot()).toBe(empty);
        c.push({ name: "a" });
        const s1 = c.getSnapshot();
        expect(s1).not.toBe(empty);
        expect(c.getSnapshot()).toBe(s1);
        expect(Object.isFrozen(s1)).toBe(true);
        expect(Object.isFrozen(s1.stack)).toBe(true);
        expect(Object.isFrozen(s1.top)).toBe(true);
    });

    it("notifies once per change and not for no-ops", () => {
        const c = createModalController();
        const listener = jest.fn();
        const unsubscribe = c.subscribe(listener);

        c.pop();
        c.close();
        expect(listener).not.toHaveBeenCalled();

        c.push({ name: "a" });
        c.replace({ name: "b" });
        c.close();
        expect(listener).toHaveBeenCalledTimes(3);

        unsubscribe();
        c.push({ name: "c" });
        expect(listener).toHaveBeenCalledTimes(3);
    });

    it("removeWhere drops matching entries in one commit", () => {
        const c = createModalController();
        c.push({ name: "a/x" });
        c.push({ name: "b/x" });
        c.push({ name: "a/y" });
        const listener = jest.fn();
        c.subscribe(listener);

        c.removeWhere((e) => e.name.startsWith("a/"));
        expect(names(c)).toEqual(["b/x"]);
        expect(listener).toHaveBeenCalledTimes(1);

        c.removeWhere((e) => e.name.startsWith("a/"));
        expect(listener).toHaveBeenCalledTimes(1);
    });

    describe("openAfterClose", () => {
        it("closes now, runs beforeClose first, opens after the delay", () => {
            const { scheduler, flush } = manualScheduler();
            const c = createModalController({ scheduler });
            const order: string[] = [];
            c.subscribe(() => order.push(`depth:${c.depth}`));
            c.push({ name: "a" });
            order.length = 0;

            c.openAfterClose({ name: "b" }, { beforeClose: () => order.push("beforeClose") });
            expect(order).toEqual(["beforeClose", "depth:0"]);

            flush();
            expect(names(c)).toEqual(["b"]);
        });

        it("passes delayMs to the scheduler", () => {
            const set = jest.fn(() => 1);
            const c = createModalController({ scheduler: { set, clear: jest.fn() }, afterCloseMs: 100 });
            c.openAfterClose({ name: "a" });
            expect(set).toHaveBeenLastCalledWith(expect.any(Function), 100);
            c.openAfterClose({ name: "a" }, { delayMs: 5 });
            expect(set).toHaveBeenLastCalledWith(expect.any(Function), 5);
        });

        it.each([
            ["push", (c: ReturnType<typeof createModalController>) => c.push({ name: "x" })],
            ["replace", (c: ReturnType<typeof createModalController>) => c.replace({ name: "x" })],
            ["close", (c: ReturnType<typeof createModalController>) => c.close()],
        ])("is cancelled by a later %s", (_, act) => {
            const { scheduler, flush, pending } = manualScheduler();
            const c = createModalController({ scheduler });
            c.openAfterClose({ name: "late" });
            expect(pending()).toBe(1);

            act(c);
            expect(pending()).toBe(0);
            flush();
            expect(names(c)).not.toContain("late");
        });

        it("cancelPending(owner) drops only that owner's open", () => {
            const { scheduler, flush, pending } = manualScheduler();
            const c = createModalController({ scheduler });
            c.openAfterClose({ name: "a/x" }, { owner: "a" });

            c.cancelPending("b");
            expect(pending()).toBe(1);
            c.cancelPending("a");
            expect(pending()).toBe(0);

            c.openAfterClose({ name: "a/x" }, { owner: "a" });
            c.cancelPending();
            expect(pending()).toBe(0);
            flush();
            expect(c.depth).toBe(0);
        });

        it("owner is forgotten once the open fires", () => {
            const { scheduler, flush, pending } = manualScheduler();
            const c = createModalController({ scheduler });
            c.openAfterClose({ name: "a/x" }, { owner: "a" });
            flush();
            c.openAfterClose({ name: "y" });
            c.cancelPending("a");
            expect(pending()).toBe(1);
        });

        it("a second openAfterClose supersedes the first", () => {
            const { scheduler, flush } = manualScheduler();
            const c = createModalController({ scheduler });
            c.openAfterClose({ name: "first" });
            c.openAfterClose({ name: "second" });
            flush();
            expect(names(c)).toEqual(["second"]);
        });
    });
});
