/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    /** Secondary/muted text */
    secondaryText: '#666666',
    /** Placeholder and empty state text */
    placeholder: '#999999',
    /** Card/surface background */
    card: '#f5f5f5',
    /** Borders and dividers */
    border: '#e0e0e0',
    /** Input background */
    inputBg: '#f5f5f5',
    /** Primary button background */
    primaryButton: '#000000',
    /** Primary button text */
    primaryButtonText: '#FFFFFF',
    /** Secondary/warning surface (e.g. system messages) */
    warningSurface: '#FFE5B4',
    warningBorder: '#FFD700',
    /** Thinking/reasoning accent */
    accent: '#5B21B6',
    accentSurface: '#F5F3FF',
    accentBorder: '#A78BFA',
    /** Header/surface with blur */
    headerBg: 'rgba(255,255,255,0.8)',
    headerBorder: 'rgba(0,0,0,0.05)',
  },
  dark: {
    /** Slate palette: white text on lighter slate background for better visibility */
    text: '#FFFFFF',
    background: '#1e293b', // slate-800
    tint: '#94a3b8', // slate-400, readable accent
    icon: '#e2e8f0', // slate-200
    tabIconDefault: '#e2e8f0',
    tabIconSelected: '#f1f5f9',
    secondaryText: '#cbd5e1', // slate-300
    placeholder: '#94a3b8', // slate-400
    card: '#334155', // slate-700
    border: '#475569', // slate-600
    inputBg: '#334155', // slate-700
    primaryButton: '#f1f5f9', // slate-100
    primaryButtonText: '#0f172a', // slate-900
    warningSurface: '#422a1a',
    warningBorder: '#78350f',
    accent: '#a5b4fc', // indigo-300, readable on slate
    accentSurface: '#312e81',
    accentBorder: '#6366f1',
    headerBg: 'rgba(30,41,59,0.95)', // slate-800
    headerBorder: 'rgba(71,85,105,0.6)', // slate-600
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
