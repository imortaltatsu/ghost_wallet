# App icons & splash (APK / AAB)

Replace these files with your **GhostWallet** logos so the built APK shows them correctly.

## Required files (`assets/images/`)

| File | Size | Purpose |
|------|------|--------|
| `icon.png` | **1024×1024** | Main app icon (iOS, Android fallback, web favicon source) |
| `android-icon-foreground.png` | **1024×1024** | Android adaptive icon – logo only, **transparent background**. Keep important content in the center 66% (safe zone). |
| `android-icon-background.png` | **1024×1024** | Android adaptive icon – background layer (or use solid color in `app.json`). |
| `android-icon-monochrome.png` | **1024×1024** | Android 13+ themed icon – single-color (e.g. white) on transparent. |
| `splash-icon.png` | **200–400px** width | Splash screen logo (centered). PNG with transparency works best. |
| `favicon.png` | **48×48** (or 32×32) | Web favicon. |

## Icon in Expo Go vs development build

- **Expo Go** reads the icon from `app.json` at runtime, so changes show immediately.
- **Development build** (e.g. `bun run android`) uses the icon baked into the native `android/` folder at **prebuild** time. If the thumbnail/icon is wrong or missing in the dev build, regenerate native and rebuild.

## After replacing assets (or when icon is wrong in dev build)

1. **Regenerate native projects** so the dev build / APK embeds the new icons:
   ```bash
   bun run prebuild:clean
   ```
2. **Build**:
   ```bash
   bun run android
   ```
   Or do both in one step:
   ```bash
   bun run android:rebuild
   ```
   Or with EAS: `eas build --platform android --profile preview`

## Notes

- Use PNG with no extra transparency bleed; Android crops to a circle/squircle.
- Adaptive icon foreground: avoid important detail at the very edges; the system may mask or scale.
- Splash and adaptive icon background color are set in `app.json` (e.g. `#1e293b` for dark).
