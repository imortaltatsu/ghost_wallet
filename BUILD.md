# Building the APK

## Release APK (for distribution / testing)

```bash
bun run android:apk
```

Output:

- **Path:** `android/app/build/outputs/apk/release/app-release.apk`
- Signed with the debug keystore (fine for testing; for Play Store use a release keystore).

## Debug APK

```bash
bun run android:apk:debug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Before building

1. **Regenerate native project** if you changed `app.json` or assets:
   ```bash
   bun run prebuild:clean
   ```
2. **Set Android SDK** in `android/local.properties`:
   ```properties
   sdk.dir=/path/to/Android/sdk
   ```
   (e.g. macOS: `sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk`)

## Production release

For Play Store you need your own release keystore. See [Android signing](https://reactnative.dev/docs/signed-apk-android) and configure `signingConfigs.release` in `android/app/build.gradle` with your keystore.
