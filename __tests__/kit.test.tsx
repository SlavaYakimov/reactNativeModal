import { createModalController } from "@slavayakimov/react-native-modal-stack/core";
import {
    ActionMenuSheet,
    CheckboxListSheet,
    ConfirmSheet,
    ModalKitProvider,
    OptionListSheet,
} from "@slavayakimov/react-native-modal-stack/kit";
import { ModalProvider } from "@slavayakimov/react-native-modal-stack/react";
import type React from "react";
import { act } from "react";
import { Text } from "react-native";
import TestRenderer from "react-test-renderer";

function render(element: React.ReactElement) {
    const controller = createModalController();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(<ModalProvider controller={controller}>{element}</ModalProvider>);
    });
    const byTestId = (id: string) =>
        renderer.root.findAll((node) => node.props.testID === id && node.props.accessibilityState != null)[0];
    const press = (id: string) => act(() => byTestId(id).props.onPress());
    const texts = () => renderer.root.findAllByType(Text).map((node) => node.props.children);
    return { controller, renderer, byTestId, press, texts };
}

describe("ActionMenuSheet", () => {
    it("renders visible actions and calls their handlers", () => {
        const rename = jest.fn();
        const { press, texts } = render(
            <ActionMenuSheet
                title="Actions"
                items={[
                    { key: "rename", label: "Rename", onPress: rename },
                    { key: "hidden", label: "Hidden", onPress: jest.fn(), hidden: true },
                ]}
            />,
        );
        expect(texts()).toEqual(["Actions", "Rename"]);
        press("action-rename");
        expect(rename).toHaveBeenCalledTimes(1);
    });
});

describe("ConfirmSheet", () => {
    it("wires both buttons and uses theme labels by default", () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        const { press, texts } = render(
            <ModalKitProvider theme={{ labels: { cancel: "Назад", confirm: "Удалить" } }}>
                <ConfirmSheet title="Delete?" onConfirm={onConfirm} onCancel={onCancel} destructive />
            </ModalKitProvider>,
        );
        expect(texts()).toEqual(expect.arrayContaining(["Назад", "Удалить"]));
        press("confirm-cancel");
        press("confirm-ok");
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("blocks confirm while loading", () => {
        const { byTestId } = render(<ConfirmSheet onConfirm={jest.fn()} onCancel={jest.fn()} isLoading />);
        expect(byTestId("confirm-ok").props.accessibilityState).toMatchObject({ disabled: true, busy: true });
        expect(byTestId("confirm-cancel").props.accessibilityState).toMatchObject({ disabled: true });
    });
});

describe("OptionListSheet", () => {
    it("marks the selected row and reports the pressed item", () => {
        const onSelect = jest.fn();
        const { byTestId, press } = render(
            <OptionListSheet
                items={[
                    { id: 1, label: "One" },
                    { id: "2", label: "Two", description: "second" },
                ]}
                selectedId="1"
                onSelect={onSelect}
            />,
        );
        expect(byTestId("option-1").props.accessibilityState).toMatchObject({ selected: true });
        expect(byTestId("option-2").props.accessibilityState).toMatchObject({ selected: false });
        press("option-2");
        expect(onSelect).toHaveBeenCalledWith({ id: "2", label: "Two", description: "second" });
    });

    it("shows the empty hint", () => {
        const { texts } = render(<OptionListSheet items={[]} onSelect={jest.fn()} emptyLabel="No banks" />);
        expect(texts()).toContain("No banks");
    });
});

describe("CheckboxListSheet", () => {
    const items = [
        { id: 1, label: "A" },
        { id: 2, label: "B" },
    ];

    it("keeps the draft local and commits ids on confirm, then closes the stack", () => {
        const onConfirm = jest.fn();
        const { controller, press, byTestId } = render(
            <CheckboxListSheet items={items} initialSelectedIds={[1]} onConfirm={onConfirm} />,
        );
        act(() => controller.push({ name: "list" }));
        press("checkbox-2");
        press("checkbox-1");
        expect(byTestId("checkbox-2").props.accessibilityState).toMatchObject({ checked: true });
        expect(onConfirm).not.toHaveBeenCalled();
        press("checkbox-confirm");
        expect(onConfirm).toHaveBeenCalledWith([2]);
        expect(controller.getSnapshot().depth).toBe(0);
    });

    it("controlled mode forwards toggles to the parent", () => {
        const onToggle = jest.fn();
        const { press } = render(
            <CheckboxListSheet items={items} selectedIds={[]} onToggle={onToggle} onConfirm={jest.fn()} />,
        );
        press("checkbox-1");
        expect(onToggle).toHaveBeenCalledWith(items[0]);
    });
});
