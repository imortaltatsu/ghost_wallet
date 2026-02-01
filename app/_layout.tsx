import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSettingsStore } from "@/store/settingsStore";
import { useWalletStore } from "@/store/walletStore";
import "@/utils/polyfills"; // Must be first so Buffer/process/stream exist before any SDK
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const { colorScheme, load } = useSettingsStore();
  const loadWallet = useWalletStore((state) => state.loadWallet);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const resolvedTheme =
    colorScheme === "system"
      ? systemColorScheme ?? "light"
      : colorScheme;
  const theme = resolvedTheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings/ai-settings"
            options={{
              title: "Settings",
              presentation: "modal",
            }}
          />
        </Stack>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
