const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Polyfill Node.js modules. util, assert must be real (stateless.js / compressed-token deps).
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  process: require.resolve("process/browser"),
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
  os: require.resolve("os-browserify"),
  path: require.resolve("path-browserify"),
  events: require.resolve("events"),
  vm: require.resolve("vm-browserify"),
  util: require.resolve("util"),
  assert: require.resolve("assert/"),
  fs: require.resolve("./mocks/empty.js"),
  child_process: require.resolve("./mocks/empty.js"),
  net: require.resolve("./mocks/empty.js"),
  tls: require.resolve("./mocks/empty.js"),
  "cli-progress": require.resolve("./mocks/empty.js"),
  "web-worker": require.resolve("./mocks/empty.js"),
  http: require.resolve("./mocks/empty.js"),
  https: require.resolve("./mocks/empty.js"),
  zlib: require.resolve("./mocks/empty.js"),
  url: require.resolve("url"),
  readline: require.resolve("./mocks/empty.js"),
  constants: require.resolve("constants-browserify"),
};

// Only stub modules that cannot work in React Native. Do NOT stub util, url, constants
// or stateless.js/Anchor/circomlibjs will get empty modules and throw "prototype of undefined".
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const stubOnly = [
    "web-worker",
    "fs",
    "child_process",
    "cli-progress",
    "http",
    "https",
    "zlib",
    "readline",
  ];
  if (stubOnly.includes(moduleName)) {
    return {
      filePath: require.resolve("./mocks/empty.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure .cjs and .mjs files are handled
config.resolver.sourceExts.push("cjs", "mjs");

module.exports = config;
