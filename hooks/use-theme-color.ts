/**
 * Returns the theme color for the resolved theme (Settings > Dark mode).
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";

export type ThemeColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName
): string {
  const theme = useResolvedTheme();
  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;
  const themeColors = Colors[theme] as Record<string, string>;
  return themeColors[colorName] ?? Colors.light[colorName as keyof typeof Colors.light];
}
