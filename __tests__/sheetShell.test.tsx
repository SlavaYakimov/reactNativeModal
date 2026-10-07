import type { ModalShellProps } from "@slavayakimov/react-native-modal-stack/react";
import {
    createSheetShell,
    type SheetBackButtonProps,
    type SheetTitleProps,
} from "@slavayakimov/react-native-modal-stack/react-native";
import { act } from "react";
import { Text } from "react-native";
import TestRenderer from "react-test-renderer";

const BACK = "back";
const BODY = "body";
const LEFT = "left";

function TestBack({ onPress, accessibilityLabel }: SheetBackButtonProps) {
    return (
        <Text testID="back" accessibilityLabel={accessibilityLabel} onPress={onPress}>
            {BACK}
        </Text>
    );
}

function TestTitle({ children }: SheetTitleProps) {
    return <Text testID="title">{children}</Text>;
}

const Shell = createSheetShell({
    BackButton: TestBack,
    TitleComponent: TestTitle,
    backAccessibilityLabel: () => "Назад",
});

function render(props: Partial<ModalShellProps>) {
    const onBack = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(
            <Shell visible layout="fit" canGoBack={false} onDismiss={jest.fn()} onBack={onBack} {...props}>
                <Text>{BODY}</Text>
            </Shell>,
        );
    });
    expect(renderer.root.findAll((node) => node.type === Text && node.props.children === BODY)).toHaveLength(1);
    const backs = renderer.root.findAllByType(TestBack);
    return { renderer, onBack, backs };
}

describe("SheetShell back button", () => {
    it("shows a back row when the stack can go back and there is no title", () => {
        const { backs, onBack, renderer } = render({ canGoBack: true });
        expect(backs).toHaveLength(1);
        expect(renderer.root.findAllByType(TestTitle)).toHaveLength(0);
        act(() => backs[0].props.onPress());
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("puts the back button into the title header", () => {
        const { backs, renderer } = render({ canGoBack: true, title: "Заказ" });
        expect(backs).toHaveLength(1);
        expect(renderer.root.findAll((node) => node.type === TestTitle)).toHaveLength(1);
    });

    it("has no back button on the stack root", () => {
        expect(render({ canGoBack: false }).backs).toHaveLength(0);
        expect(render({ canGoBack: false, title: "Заказ" }).backs).toHaveLength(0);
    });

    it("passes the configured accessibility label", () => {
        expect(render({ canGoBack: true }).backs[0].props.accessibilityLabel).toBe("Назад");
    });

    it("prefers explicit leftContent over the back button", () => {
        const { backs, renderer } = render({ canGoBack: true, leftContent: <Text testID="left">{LEFT}</Text> });
        expect(backs).toHaveLength(0);
        expect(renderer.root.findAll((node) => node.props.testID === "left" && node.type === Text)).toHaveLength(1);
    });
});

describe("SheetShell appearance", () => {
    const hasBackground = (renderer: TestRenderer.ReactTestRenderer, color: string) =>
        renderer.root.findAll(
            (node) =>
                typeof node.type === "string" &&
                [node.props.style].flat(Infinity).some((style) => style?.backgroundColor === color),
        ).length > 0;

    function renderThemed(options: Parameters<typeof createSheetShell>[0]) {
        const Themed = createSheetShell({ BackButton: TestBack, ...options });
        let renderer!: TestRenderer.ReactTestRenderer;
        act(() => {
            renderer = TestRenderer.create(
                <Themed visible layout="fit" canGoBack onDismiss={jest.fn()} onBack={jest.fn()}>
                    <Text>{BODY}</Text>
                </Themed>,
            );
        });
        return renderer;
    }

    it("uses the static appearance", () => {
        const renderer = renderThemed({ appearance: { sheetColor: "#101010", backdropColor: "#202020" } });
        expect(hasBackground(renderer, "#101010")).toBe(true);
        expect(hasBackground(renderer, "#202020")).toBe(true);
    });

    it("lets the appearance hook override static values and tints the back button", () => {
        const renderer = renderThemed({
            appearance: { sheetColor: "#101010" },
            useAppearance: () => ({ sheetColor: "#303030", tintColor: "#404040" }),
        });
        expect(hasBackground(renderer, "#303030")).toBe(true);
        expect(hasBackground(renderer, "#101010")).toBe(false);
        expect(renderer.root.findByType(TestBack).props.tintColor).toBe("#404040");
    });
});
