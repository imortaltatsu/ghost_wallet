#!/usr/bin/env node

/**
 * Build IPA and upload to GitHub release (or upload only if IPA exists).
 * Requires: macOS, Xcode, gh CLI, and ios/ExportOptions.plist with valid teamID.
 *
 * Usage:
 *   bun run release:ipa              # build IPA then upload to release (tag from RELEASE_TAG or milestone-2)
 *   RELEASE_TAG=v1.0.0 bun run release:ipa
 *   bun run release:ipa:upload      # upload only (skip build); IPA must exist in ios/build/ipa/
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const iosDir = path.join(root, "ios");
const ipaDir = path.join(iosDir, "build", "ipa");
const defaultTag = process.env.RELEASE_TAG || "milestone-2";

function run(cmd, cwd = root, env = process.env) {
  console.log("$", cmd);
  execSync(cmd, { cwd, env, stdio: "inherit" });
}

function getIpaPath() {
  if (!fs.existsSync(ipaDir)) return null;
  const files = fs.readdirSync(ipaDir);
  const ipa = files.find((f) => f.endsWith(".ipa"));
  return ipa ? path.join(ipaDir, ipa) : null;
}

const uploadOnly = process.argv.includes("--upload-only") || process.env.RELEASE_IPA_UPLOAD_ONLY === "1");

if (!uploadOnly) {
  console.log("\nBuilding IPA...\n");
  run("bun run buildipa", root);
}

const ipaPath = getIpaPath();
if (!ipaPath) {
  console.error("\nNo IPA found in ios/build/ipa/. Run 'bun run buildipa' first, or build then run this script without --upload-only.");
  process.exit(1);
}

const tag = process.env.RELEASE_TAG || defaultTag;
console.log("\nUploading", path.basename(ipaPath), "to release", tag, "...\n");
try {
  run(`gh release upload "${tag}" "${ipaPath}" --clobber`, root);
  console.log("\nDone. IPA is attached to release:", tag);
} catch (e) {
  if (e.status === 1 && (e.message || "").includes("release not found")) {
    console.error("\nRelease", tag, "not found. Create it first, e.g.:");
    console.error("  gh release create", tag, "--title", JSON.stringify(tag), "--notes \"Milestone 2 IPA\"");
    console.error("Then run this script again.");
  }
  process.exit(e.status ?? 1);
}
