const fs = require("fs");
const path = require("path");

// Load .env so EXPO_PUBLIC_* is available when building release (debug often loads it via Metro; release needs it here).
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*EXPO_PUBLIC_COMPRESSION_API_URL\s*=\s*(.+?)\s*$/);
    if (m && !process.env.EXPO_PUBLIC_COMPRESSION_API_URL) {
      process.env.EXPO_PUBLIC_COMPRESSION_API_URL = m[1].replace(/^["']|["']$/g, "").trim();
      break;
    }
  }
}

const appJson = require("./app.json");
module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo?.extra,
      /** ZK Compression API URL; baked at build time so release has it (debug gets from process.env). */
      compressionApiUrl: process.env.EXPO_PUBLIC_COMPRESSION_API_URL || null,
    },
  },
};
