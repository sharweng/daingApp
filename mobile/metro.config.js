const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add jfif to the list of asset extensions
config.resolver.assetExts.push("jfif");

module.exports = config;
