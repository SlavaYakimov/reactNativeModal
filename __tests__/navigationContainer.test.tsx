import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { reactNavigationScreen } from "@slavayakimov/react-native-modal-stack/navigation";
import { act } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TestRenderer from "react-test-renderer";

jest.unmock("react-native-safe-area-context");

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

type Routes = { first: undefined; second: undefined };

const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();
const onLeave = jest.fn();
const activity: boolean[] = [];

function First() {
    activity.push(reactNavigationScreen.useIsActive());
    reactNavigationScreen.useOnLeave(onLeave);
    return null;
}

function Second() {
    return null;
}

describe("reactNavigationScreen inside a real navigator", () => {
    it("calls onLeave when another screen is pushed and reports the screen inactive", () => {
        act(() => {
            TestRenderer.create(
                <SafeAreaProvider initialMetrics={METRICS}>
                    <NavigationContainer ref={navigation}>
                        <Stack.Navigator>
                            <Stack.Screen name="first" component={First} />
                            <Stack.Screen name="second" component={Second} />
                        </Stack.Navigator>
                    </NavigationContainer>
                </SafeAreaProvider>,
            );
        });
        expect(activity.at(-1)).toBe(true);
        expect(onLeave).not.toHaveBeenCalled();

        act(() => navigation.navigate("second"));
        expect(onLeave).toHaveBeenCalledTimes(1);
        expect(activity.at(-1)).toBe(false);
    });
});
