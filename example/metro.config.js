const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Library sources live one level up; resolve every dependency from the example's node_modules
// so React and React Native exist exactly once.
config.watchFolders = [libraryRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = { "@slavayakimov/react-native-modal-stack": libraryRoot };
config.resolver.blockList = [
    new RegExp(`^${path.join(libraryRoot, "node_modules").replace(/[/\\.]/g, "\\$&")}[/\\\\].*`),
    new RegExp(`^${path.join(libraryRoot, "lib").replace(/[/\\.]/g, "\\$&")}[/\\\\].*`),
];

module.exports = config;
