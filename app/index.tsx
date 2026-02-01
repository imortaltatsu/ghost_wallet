import { ChatContainer } from "@/components/chat/ChatContainer";
import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { LlamaService } from "@/services/llm/LlamaService";
import { useChatStore } from "@/store/chatStore";
import { useLLMStore } from "@/store/llmStore";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [isInitializing, setIsInitializing] = useState(false);
  const insets = useSafeAreaInsets();
  const theme = useResolvedTheme();
  const c = Colors[theme];

  const {
    currentModel,
    modelConfig,
    isModelLoaded,
    setModelLoaded,
    setError,
    loadAvailableModels,
    availableModels,
    setCurrentModel,
  } = useLLMStore();

  const { clearHistory } = useChatStore();
  const llamaService = LlamaService.getInstance();

  // Auto-initialize weights effect
  useEffect(() => {
    const init = async () => {
      // 0. Load persisted settings first
      await useLLMStore.getState().loadSettings();

      // 1. Load available models list (verifies files)
      await loadAvailableModels();

      // 2. Auto-select recommended model if none selected
      const state = useLLMStore.getState();
      if (!state.currentModel) {
        // Use getState() logic equivalent - accessing from hook due to closure
        const recommended =
          state.availableModels.find((m) => m.recommended) ||
          state.availableModels[0];
        if (recommended) {
          setCurrentModel(recommended);
        }
      }
    };

    init();
  }, []); // Run once on mount

  // Auto-load weights if downloaded and ready
  useEffect(() => {
    const autoLoad = async () => {
      if (
        currentModel?.downloaded &&
        !isModelLoaded &&
        !isInitializing &&
        !llamaService.isReady()
      ) {
        console.log("Auto-initializing weights for:", currentModel.name);
        await initializeModel();
      }
    };

    if (currentModel?.downloaded) {
      // Small delay to ensure UI renders first
      const timer = setTimeout(autoLoad, 500);
      return () => clearTimeout(timer);
    }
  }, [currentModel, isModelLoaded]);

  const initializeModel = async () => {
    if (!currentModel?.localPath) {
      if (!currentModel?.downloaded) {
        return;
      }
      await loadAvailableModels();
      return;
    }

    if (llamaService.isReady()) {
      setModelLoaded(true);
      return;
    }

    setIsInitializing(true);
    setError(null);
    try {
      const RNFS =
        require("react-native-fs").default ?? require("react-native-fs");
      const exists = await RNFS.exists(currentModel.localPath);
      if (!exists) {
        setError(
          "Model file not found. Please re-download the model in AI Settings.",
        );
        await loadAvailableModels();
        return;
      }
      await llamaService.initialize({
        ...modelConfig,
        modelPath: currentModel.localPath,
        modelName: currentModel.name,
      });
      setModelLoaded(true);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load model";
      console.error("Failed to initialize model:", error);
      setError(
        msg.includes("load")
          ? `${msg} Try re-downloading in AI Settings.`
          : msg,
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Conversation",
      "This will remove all messages from this chat.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearHistory(),
        },
      ],
    );
  };

  const handleSettings = () => {
    router.push("/settings/ai-settings");
  };

  const headerStyle = useMemo(
    () => ({
      paddingTop: insets.top,
      backgroundColor: theme === "dark" ? c.headerBg : styles.headerGlass.backgroundColor,
      borderBottomColor: c.headerBorder,
    }),
    [insets.top, theme, c.headerBg, c.headerBorder],
  );

  const Header = () => (
    <BlurView
      intensity={Platform.OS === "ios" ? 80 : 0}
      tint={theme === "dark" ? "dark" : "light"}
      style={[styles.headerGlass, headerStyle]}
    >
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Ghost AI</Text>
          {isModelLoaded && (
            <View style={styles.activeBadge}>
              <View
                style={[styles.activeDot, { backgroundColor: "#34C759" }]}
              />
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/wallet")}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: pressed ? c.card : c.border + "40" },
            ]}
          >
            <Ionicons name="wallet-outline" size={22} color={c.text} />
          </Pressable>
          <Pressable
            onPress={handleClearHistory}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: pressed ? c.card : c.border + "40" },
            ]}
          >
            <Ionicons name="trash-outline" size={22} color={c.text} />
          </Pressable>
          <Pressable
            onPress={handleSettings}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: pressed ? c.card : c.border + "40" },
            ]}
          >
            <Ionicons name="options-outline" size={22} color={c.text} />
          </Pressable>
        </View>
      </View>
      {Platform.OS === "android" && (
        <View style={[styles.androidHeaderBorder, { backgroundColor: c.headerBorder }]} />
      )}
    </BlurView>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack.Screen options={{ headerShown: false }} />

      <Header />

      <View
        style={[
          styles.contentContainer,
          { paddingTop: Platform.OS === "ios" ? insets.top + 50 : 60 },
        ]}
      >
        {!currentModel ? (
          <View style={styles.stateContainer}>
            <View style={[styles.iconContainer, { backgroundColor: theme === "dark" ? c.border + "40" : undefined }]}>
              <Ionicons name="cube-outline" size={48} color={c.tint} />
            </View>
            <Text style={[styles.stateTitle, { color: c.text }]}>Select a Model</Text>
            <Text style={[styles.stateDescription, { color: c.secondaryText }]}>
              Choose a secure, on-device AI model to start chatting.
            </Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: c.primaryButton }]} onPress={handleSettings}>
              <Text style={[styles.primaryButtonText, { color: c.primaryButtonText }]}>Select Model</Text>
              <Ionicons name="chevron-forward" size={16} color={c.primaryButtonText} />
            </Pressable>
          </View>
        ) : !currentModel.downloaded ? (
          <View style={styles.stateContainer}>
            <View style={[styles.iconContainer, { backgroundColor: theme === "dark" ? c.border + "40" : undefined }]}>
              <Ionicons
                name="cloud-download-outline"
                size={48}
                color={c.tint}
              />
            </View>
            <Text style={[styles.stateTitle, { color: c.text }]}>Download Required</Text>
            <Text style={[styles.stateDescription, { color: c.secondaryText }]}>
              Download {currentModel.name} ({currentModel.size}) to enable
              offline AI.
            </Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: c.primaryButton }]} onPress={handleSettings}>
              <Text style={[styles.primaryButtonText, { color: c.primaryButtonText }]}>Download Now</Text>
            </Pressable>
          </View>
        ) : isInitializing ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={c.tint} />
            <Text style={[styles.loadingText, { color: c.text }]}>Loading Neural Engine...</Text>
            <Text style={[styles.loadingSubtext, { color: c.secondaryText }]}>{currentModel.name}</Text>
          </View>
        ) : (
          <ChatContainer />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerGlass: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.8)" : "#FFF", // Android doesn't support BlurView well
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  androidHeaderBorder: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  activeBadge: {
    padding: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonPressed: {
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  stateDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 280,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100, // Pill shape
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
});
