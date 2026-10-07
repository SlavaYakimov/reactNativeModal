require("react-native-gesture-handler/jestSetup");

global.__reanimatedWorkletInit = () => undefined;
jest.mock("react-native-reanimated", () => {
    const Reanimated = require("react-native-reanimated/mock");
    Reanimated.default.call = () => undefined;
    return Reanimated;
});

jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    const inset = { top: 0, right: 0, bottom: 0, left: 0 };
    const frame = { x: 0, y: 0, width: 390, height: 844 };
    const SafeAreaProvider = (props) => React.createElement(View, props);
    return {
        SafeAreaProvider,
        SafeAreaView: SafeAreaProvider,
        useSafeAreaInsets: () => inset,
        useSafeAreaFrame: () => frame,
    };
});
