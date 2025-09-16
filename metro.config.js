const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for ogg files
config.resolver.assetExts.push('ogg');

module.exports = config;
