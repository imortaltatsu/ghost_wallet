# Building release artifacts

## Android APK

### Release APK

```bash
bun run android:apk
```

- **Output:** `android/app/build/outputs/apk/release/app-release.apk`
- Signed with the debug keystore (fine for testing; for Play Store use a release keystore).

### Debug APK

```bash
bun run android:apk:debug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## iOS IPA (Xcode CLI)

Requires **macOS** and **Xcode**.

### Using the build script (recommended)

```bash
bun run buildipa
```

The script will:

1. Run **prebuild** if `ios/` does not exist.
2. Copy `ios-ExportOptions.plist.example` → `ios/ExportOptions.plist` if needed (you must then set your **teamID** in `ios/ExportOptions.plist`).
3. Run **xcodebuild archive** and **xcodebuild -exportArchive**.

**First time:** Copy the example, set your Apple Developer Team ID in `ios/ExportOptions.plist`, then run again:

```bash
# After first run (script copies example), edit teamID in:
# ios/ExportOptions.plist
bun run buildipa
```

**Output:** IPA in `ios/build/ipa/*.ipa`.

### Free (personal) Apple account

You **can** get an IPA with a **free** Apple ID (personal team), with limits:

1. **Use development export** (not Ad Hoc). In `ios/ExportOptions.plist` set:
   - `method` → `development`
   - `teamID` → your **personal Team ID** (Xcode: Signing & Capabilities → Team; or [developer.apple.com/account](https://developer.apple.com/account) → Membership).
2. **One-time in Xcode:** Open `ios/ghostwallet.xcworkspace`, select the GhostWallet target, **Signing & Capabilities** → check "Automatically manage signing" and pick your personal team. That creates the development certificate and provisioning profile.
3. Run `bun run buildipa`.

**Result:** You get an IPA signed for **development**. It installs only on **devices registered in your (free) team** (your iPhone when you first ran the app from Xcode, etc.). On a **free** account, the app **expires after 7 days** and must be reinstalled. No TestFlight, no App Store, no sending to arbitrary testers.

To use the example plist for free account:

```bash
cp ios-ExportOptions-development.plist.example ios/ExportOptions.plist
# Edit ios/ExportOptions.plist and set teamID to your personal Team ID
bun run buildipa
```

**Custom scheme:** If your scheme is not `GhostWallet`, set `IOS_SCHEME`:

```bash
IOS_SCHEME=YourScheme bun run buildipa
```

**"Database is locked" / concurrent builds:** Quit Xcode, then run `rm -rf ~/Library/Developer/Xcode/DerivedData/GhostWallet-*` and try again. Do not run `buildipa` and an Xcode build at the same time.

**"No signing certificate 'iOS Distribution' found" / "No profiles for 'com.yeetlabs.ghostwallet' were found":** The archive step can succeed with development signing, but exporting an IPA needs **distribution** signing:

1. **Apple Developer Program** – You need a paid account (e.g. [developer.apple.com](https://developer.apple.com)).
2. **Apple Distribution certificate** – In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list), create an **Apple Distribution** certificate, download it, and double‑click to install into your Keychain. This is the certificate Xcode calls “iOS Distribution”.
3. **App ID** – Register an App ID for `com.yeetlabs.ghostwallet` (or your bundle ID) if needed.
4. **Ad Hoc / release-testing profile** – Create a provisioning profile of type **Ad Hoc** (Xcode now calls the method `release-testing`). Select the app ID, the Distribution certificate, and the test devices. Download the profile; Xcode usually picks it up, or install it via double‑click.
5. **ExportOptions.plist** – Set `method` to `release-testing` and `teamID` to your 10‑character Team ID (from the Apple Developer membership page).

Until these are in place, only the archive will succeed; the export step will fail with the above errors.

**Get IPA via Xcode (recommended when CLI export fails):** Use Xcode Organizer so signing and profiles are handled in the UI.

1. **Archive:** `bun run buildipa:archive` (or `ARCHIVE_ONLY=1 bun run buildipa`). Creates `ios/build/GhostWallet.xcarchive`. If you already have this archive, skip to step 2.
2. **Open Xcode Organizer:** In Xcode → **Window → Organizer** (shortcut: **Cmd+Shift+Option+O**). Your archive should appear under Archives; if not, drag `ios/build/GhostWallet.xcarchive` into the Organizer window.
3. **Export IPA:** Select the **GhostWallet** archive in the list → click **Distribute App**.
4. **Choose distribution:** Pick **Development** (uses your Apple Development cert and team profile) or **Ad Hoc** / **App Store** if you have those set up → **Next**.
5. **Signing:** Leave **Automatically manage signing** (or pick your team/certificate) → **Next** → **Export** and choose a folder. Xcode writes the IPA there.
6. **Upload to GitHub:** `gh release upload milestone-2 /path/to/GhostWallet.ipa --clobber`

### Manual steps (optional)

1. **Generate iOS project:** `bun run prebuild` (or `bun run prebuild:clean` if `ios/` exists and you changed config).
2. **Export options:** Copy `ios-ExportOptions.plist.example` to `ios/ExportOptions.plist` and set `teamID`.
3. **Archive:** From `ios/`: `xcodebuild -workspace ghostwallet.xcworkspace -scheme ghostwallet -configuration Release -archivePath build/GhostWallet.xcarchive archive`
4. **Export:** `xcodebuild -exportArchive -archivePath build/GhostWallet.xcarchive -exportPath build/ipa -exportOptionsPlist ExportOptions.plist`

For App Store use `method` = `app-store` in ExportOptions.plist and the right signing.

---

## Before building (both platforms)

1. **Regenerate native projects** if you changed `app.json` or assets:
   ```bash
   bun run prebuild:clean
   ```
2. **Android:** Set `sdk.dir` in `android/local.properties` (e.g. `sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk`).

## Production

- **Android:** For Play Store use your own release keystore; configure `signingConfigs.release` in `android/app/build.gradle`. See [Android signing](https://reactnative.dev/docs/signed-apk-android).
- **iOS:** For App Store use `method` = `app-store` in ExportOptions.plist and your distribution certificate/provisioning profile.
