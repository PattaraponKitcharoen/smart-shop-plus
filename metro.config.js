const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 🚩 บอกให้ Metro รู้จักไฟล์ .wasm (WebAssembly)
config.resolver.assetExts.push('wasm');

module.exports = config;