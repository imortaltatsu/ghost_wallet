#!/usr/bin/env node

/**
 * Build iOS IPA via Xcode CLI (archive + export).
 * Requires macOS, Xcode, and ios/ (run prebuild first if missing).
 * Set your Team ID in ios/ExportOptions.plist. For free (personal) account use method "development"
 * (copy ios-ExportOptions-development.plist.example). See BUILD.md.
 *
 * If you see "database is locked" or "concurrent builds": quit Xcode, run
 *   rm -rf ~/Library/Developer/Xcode/DerivedData/GhostWallet-*
 * then run this script again. Do not run buildipa and Xcode build at the same time.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const iosDir = path.join(root, "ios");
const workspace = "ghostwallet.xcworkspace";
const scheme = process.env.IOS_SCHEME || "GhostWallet";
const archivePath = path.join(iosDir, "build", "GhostWallet.xcarchive");
const exportPath = path.join(iosDir, "build", "ipa");
const exportPlist = path.join(iosDir, "ExportOptions.plist");
const examplePlist = path.join(root, "ios-ExportOptions.plist.example");
const developmentExamplePlist = path.join(root, "ios-ExportOptions-development.plist.example");

function run(cmd, cwd = root, env = process.env) {
  console.log("$", cmd);
  execSync(cmd, { cwd, env, stdio: "inherit" });
}

// Only run on macOS
if (process.platform !== "darwin") {
  console.error("iOS build requires macOS and Xcode.");
  process.exit(1);
}

// 1. Ensure ios/ exists
if (!fs.existsSync(iosDir)) {
  console.log("Generating iOS project (prebuild)...");
  run("bun run prebuild");
}

// Archive-only mode: skip ExportOptions and export step
const archiveOnly = process.env.ARCHIVE_ONLY === "1" || process.argv.includes("--archive-only");

// 2. Ensure ExportOptions.plist exists with user's Team ID (skip if archive-only)
if (!archiveOnly && !fs.existsSync(exportPlist)) {
  const useDevelopment = process.env.IOS_FREE_TEAM === "1" || process.env.IOS_FREE_TEAM === "true";
  const src = useDevelopment && fs.existsSync(developmentExamplePlist)
    ? developmentExamplePlist
    : examplePlist;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, exportPlist);
    const label = src === developmentExamplePlist ? "development (free account)" : "release-testing (paid)";
    console.error("\nCopied " + path.basename(src) + " → ios/ExportOptions.plist (" + label + ")");
    console.error("Edit ios/ExportOptions.plist and set your teamID, then run:");
    console.error("  bun run buildipa\n");
  } else {
    console.error("Missing ios/ExportOptions.plist. Create it (see BUILD.md) with method and teamID.");
  }
  process.exit(1);
}

// Warn if teamID is still placeholder (export would fail) — skip if archive-only
if (!archiveOnly) {
  try {
    const plistContent = fs.readFileSync(exportPlist, "utf8");
    const teamIdMatch = plistContent.match(/<key>teamID<\/key>\s*<string>([^<]*)<\/string>/);
    const methodMatch = plistContent.match(/<key>method<\/key>\s*<string>([^<]*)<\/string>/);
    const teamId = teamIdMatch ? teamIdMatch[1].trim() : "";
    const method = methodMatch ? methodMatch[1].trim() : "";
    if (!teamId || teamId === "YOUR_TEAM_ID") {
      console.error("\nios/ExportOptions.plist has no valid teamID (still YOUR_TEAM_ID?).");
      if (method === "development") {
        console.error("Set your personal Team ID (Xcode → Signing & Capabilities → Team). See BUILD.md (Free account).\n");
      } else {
        console.error("Export will fail until you set your Team ID and have an iOS Distribution certificate + Ad Hoc profile. See BUILD.md.\n");
      }
    }
  } catch (_) {}
}

// 3. Archive
console.log("\nArchiving...");
run(
  `xcodebuild -workspace ${workspace} -scheme ${scheme} -configuration Release -archivePath build/GhostWallet.xcarchive archive`,
  iosDir
);

if (archiveOnly) {
  console.log("\n** ARCHIVE ONLY ** (export skipped)");
  console.log("\nArchive:", archivePath);
  console.log("\nExport to IPA manually:");
  console.log("  1. Open Xcode → Window → Organizer (Cmd+Shift+Option+O)");
  console.log("  2. Select the GhostWallet archive (or open:", archivePath, ")");
  console.log("  3. Click \"Distribute App\" → choose Ad Hoc / Development / App Store");
  console.log("  4. Follow the wizard (signing is picked in the UI)");
  console.log("  5. Save the IPA where you want, then: gh release upload <tag> <path-to-ipa> --clobber\n");
  process.exit(0);
}

// 4. Export IPA
console.log("\nExporting IPA...");
run(
  `xcodebuild -exportArchive -archivePath build/GhostWallet.xcarchive -exportPath build/ipa -exportOptionsPlist ExportOptions.plist`,
  iosDir
);

const ipaDir = path.join(iosDir, "build", "ipa");
const files = fs.existsSync(ipaDir) ? fs.readdirSync(ipaDir) : [];
const ipaFile = files.find((f) => f.endsWith(".ipa"));

console.log("\nDone.");
if (ipaFile) {
  console.log("IPA:", path.join(ipaDir, ipaFile));
} else {
  console.log("IPA directory:", ipaDir);
}
