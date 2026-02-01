/**
 * Resolves the active theme from Settings (light/dark/system).
 * Use this so UI respects the user's Dark mode choice in Settings.
 */

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSettingsStore } from "@/store/settingsStore";

export type ResolvedTheme = "light" | "dark";

export function useResolvedTheme(): ResolvedTheme {
  const systemColorScheme = useColorScheme();
  const colorScheme = useSettingsStore((s) => s.colorScheme);

  if (colorScheme === "system") {
    return (systemColorScheme ?? "light") as ResolvedTheme;
  }
  return colorScheme as ResolvedTheme;
}
