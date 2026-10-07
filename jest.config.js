module.exports = {
    preset: "react-native",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    moduleNameMapper: {
        "^@slavayakimov/react-native-modal-stack/(.*)$": "<rootDir>/src/$1",
    },
    testPathIgnorePatterns: ["/node_modules/", "/example/", "/lib/"],
    modulePathIgnorePatterns: ["<rootDir>/example/", "<rootDir>/lib/"],
    transformIgnorePatterns: [
        "node_modules/(?!(jest-)?react-native|@react-native|react-native-reanimated|@react-navigation)/",
    ],
};
