import { reactNavigationScreen } from "@slavayakimov/react-native-modal-stack/navigation";
import { act } from "react";
import TestRenderer from "react-test-renderer";

type FocusEffect = () => undefined | (() => void);
type UseEffect = (effect: FocusEffect, deps: unknown[]) => void;

const mockFocus = { focused: true };

jest.mock("@react-navigation/native", () => ({
    useIsFocused: () => mockFocus.focused,
    // Same contract as the real hook: run on focus, run the returned cleanup on blur.
    useFocusEffect: (effect: FocusEffect) => {
        const isFocused = mockFocus.focused;
        jest.requireActual<{ useEffect: UseEffect }>("react").useEffect(
            () => (isFocused ? effect() : undefined),
            [effect, isFocused],
        );
    },
}));

function Probe({ onLeave, onActive }: { onLeave: () => void; onActive: (active: boolean) => void }) {
    onActive(reactNavigationScreen.useIsActive());
    reactNavigationScreen.useOnLeave(onLeave);
    return null;
}

describe("reactNavigationScreen", () => {
    beforeEach(() => {
        mockFocus.focused = true;
    });

    it("reports focus and calls onLeave when the screen blurs", () => {
        const onLeave = jest.fn();
        const onActive = jest.fn();
        let renderer!: TestRenderer.ReactTestRenderer;
        act(() => {
            renderer = TestRenderer.create(<Probe onLeave={onLeave} onActive={onActive} />);
        });
        expect(onActive).toHaveBeenLastCalledWith(true);
        expect(onLeave).not.toHaveBeenCalled();

        mockFocus.focused = false;
        act(() => renderer.update(<Probe onLeave={onLeave} onActive={onActive} />));
        expect(onActive).toHaveBeenLastCalledWith(false);
        expect(onLeave).toHaveBeenCalledTimes(1);
    });

    it("calls onLeave when the focused screen unmounts", () => {
        const onLeave = jest.fn();
        let renderer!: TestRenderer.ReactTestRenderer;
        act(() => {
            renderer = TestRenderer.create(<Probe onLeave={onLeave} onActive={jest.fn()} />);
        });
        act(() => renderer.unmount());
        expect(onLeave).toHaveBeenCalledTimes(1);
    });
});
