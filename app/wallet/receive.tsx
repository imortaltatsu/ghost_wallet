import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useWalletStore } from "@/store/walletStore";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Stack } from "expo-router";
import React from "react";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function ReceiveScreen() {
  const theme = useResolvedTheme();
  const c = Colors[theme];
  const { publicKey, wallet } = useWalletStore();

  const copyAddress = async () => {
    if (publicKey) {
      await Clipboard.setStringAsync(publicKey);
      Alert.alert("Copied", "Address copied to clipboard");
    }
  };

  if (!wallet || !publicKey) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.noWallet, { color: c.secondaryText }]}>No wallet loaded</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: "Receive" }} />

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.label, { color: c.secondaryText }]}>Your address</Text>
        <Text style={[styles.address, { color: c.text }]} selectable numberOfLines={2}>
          {publicKey}
        </Text>
        <Pressable style={[styles.copyButton, { backgroundColor: c.tint }]} onPress={copyAddress}>
          <Ionicons name="copy-outline" size={20} color={c.primaryButtonText} />
          <Text style={[styles.copyButtonText, { color: c.primaryButtonText }]}>Copy address</Text>
        </Pressable>
      </View>

      <View style={[styles.qrCard, { backgroundColor: c.card }]}>
        <Text style={[styles.qrLabel, { color: c.text }]}>Scan to receive</Text>
        <View style={[styles.qrWrap, { backgroundColor: "#fff", borderColor: c.border }]}>
          <QRCode
            value={publicKey}
            size={220}
            backgroundColor="white"
            color="black"
            margin={2}
          />
        </View>
        <Text style={[styles.qrHint, { color: c.secondaryText }]}>
          Others can scan this QR code to send you SOL
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noWallet: {
    fontSize: 16,
    color: "#8E8E93",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    color: "#8E8E93",
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 20,
  },
  qrWrap: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  qrHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 16,
    textAlign: "center",
  },
});
