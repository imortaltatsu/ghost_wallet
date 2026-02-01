import { getSolscanTxUrl } from "@/constants/network";
import { Colors } from "@/constants/theme";
import { useAddressBookStore } from "@/store/addressBookStore";
import { useCompressedStore } from "@/store/compressedStore";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useWalletStore } from "@/store/walletStore";
import { resolveRecipientToPublicKey } from "@/utils/recipientResolution";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey } from "@solana/web3.js";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

/** Lazy-loaded QR scanner (same pattern as send.tsx). */
function QRScannerModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (result: { data: string }) => void;
}) {
  const [mod, setMod] = useState<{
    CameraView: React.ComponentType<any>;
    useCameraPermissions: () => [
      { granted: boolean } | null,
      () => Promise<any>,
    ];
  } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setErr(false);
    setMod(null);
    try {
      const m = require("expo-camera");
      setMod(m);
    } catch {
      setErr(true);
    }
  }, [visible]);

  if (!visible) return null;
  if (err) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <View style={scannerStyles.container}>
          <View style={scannerStyles.header}>
            <Text style={scannerStyles.title}>Scan recipient address</Text>
            <Pressable onPress={onClose} style={scannerStyles.closeBtn}>
              <Text style={scannerStyles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
          <View style={scannerStyles.permissionBox}>
            <Text style={scannerStyles.permissionText}>
              Camera is not available. Use a dev build or paste the address.
            </Text>
            <Pressable style={scannerStyles.permissionButton} onPress={onClose}>
              <Text style={scannerStyles.permissionButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }
  if (!mod) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <View style={[scannerStyles.container, { justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>
    );
  }
  return <CameraScannerInner mod={mod} onClose={onClose} onScan={onScan} />;
}

function CameraScannerInner({
  mod,
  onClose,
  onScan,
}: {
  mod: {
    CameraView: React.ComponentType<any>;
    useCameraPermissions: () => [
      { granted: boolean } | null,
      () => Promise<any>,
    ];
  };
  onClose: () => void;
  onScan: (result: { data: string }) => void;
}) {
  const [permission, requestPermission] = mod.useCameraPermissions();
  const CameraView = mod.CameraView;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={scannerStyles.container}>
        <View style={scannerStyles.header}>
          <Text style={scannerStyles.title}>Scan recipient address</Text>
          <Pressable onPress={onClose} style={scannerStyles.closeBtn}>
            <Text style={scannerStyles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
        {!permission?.granted ? (
          <View style={scannerStyles.permissionBox}>
            <Text style={scannerStyles.permissionText}>
              Camera access is needed to scan QR codes
            </Text>
            <Pressable
              style={scannerStyles.permissionButton}
              onPress={() => requestPermission?.()}
            >
              <Text style={scannerStyles.permissionButtonText}>
                Grant permission
              </Text>
            </Pressable>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onScan}
          />
        )}
      </View>
    </Modal>
  );
}

const scannerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#000",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#fff" },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 16, color: "#0A84FF" },
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

function isValidSolanaAddress(addr: string): boolean {
  try {
    new PublicKey(addr.trim());
    return true;
  } catch {
    return false;
  }
}

export type PrivateSendMode = "private" | "decompress";

export default function PrivateSendScreen() {
  const theme = useResolvedTheme();
  const c = Colors[theme];
  const { wallet } = useWalletStore();
  const {
    compressedSolBalance,
    transferCompressedSol,
    decompressSol,
    transferError,
  } = useCompressedStore();
  const { contacts, loadContacts } = useAddressBookStore();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [sendMode, setSendMode] = useState<PrivateSendMode>("private");

  useEffect(() => {
    loadContacts();
  }, []);

  const privateBalance = compressedSolBalance ?? 0;

  const handleScan = ({ data }: { data: string }) => {
    const trimmed = (data ?? "").trim();
    if (trimmed && isValidSolanaAddress(trimmed)) {
      setRecipient(trimmed);
      setShowScanner(false);
    } else if (trimmed) {
      Alert.alert(
        "Invalid address",
        "Scanned QR did not contain a valid Solana address.",
      );
    }
  };

  const handleSend = async () => {
    if (!wallet) {
      Alert.alert("Error", "No wallet loaded");
      return;
    }
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) {
      Alert.alert("Error", "Enter recipient address or contact name");
      return;
    }
    const val = parseFloat(amount);
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    if (val > privateBalance) {
      Alert.alert("Error", "Insufficient private SOL balance");
      return;
    }
    try {
      setIsSending(true);
      const toPubkey = resolveRecipientToPublicKey(trimmedRecipient);

      if (sendMode === "decompress") {
        const sig = await decompressSol(wallet, val, toPubkey);
        const sigStr = typeof sig === "string" ? sig : String(sig ?? "");
        Alert.alert(
          "Decompressed",
          `${val} SOL sent as public SOL to recipient.\n${sigStr.slice(0, 16)}…`,
          [
            { text: "OK" },
            {
              text: "View on Solscan",
              onPress: () => Linking.openURL(getSolscanTxUrl(sigStr)),
            },
          ],
        );
      } else {
        const sig = await transferCompressedSol(wallet, wallet, toPubkey, val);
        const sigStr = typeof sig === "string" ? sig : String(sig ?? "");
        Alert.alert(
          "Sent",
          `${val} SOL sent privately.\n${sigStr.slice(0, 16)}…`,
          [
            { text: "OK" },
            {
              text: "View on Solscan",
              onPress: () => Linking.openURL(getSolscanTxUrl(sigStr)),
            },
          ],
        );
      }
      setAmount("");
      setRecipient("");
    } catch (e) {
      Alert.alert("Send failed", (e as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  if (!wallet) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.noWallet, { color: c.secondaryText }]}>No wallet loaded</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <Stack.Screen options={{ title: "Private Send" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceLabel, { color: c.secondaryText }]}>Private SOL</Text>
          <Text style={[styles.balanceValue, { color: c.text }]}>{privateBalance.toFixed(4)} SOL</Text>
        </View>

        <Text style={[styles.label, { color: c.secondaryText }]}>Recipient (address or contact name)</Text>
        <View style={styles.recipientRow}>
          <TextInput
            style={[styles.input, styles.recipientInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
            placeholder="e.g. landlord or scan QR"
            placeholderTextColor={c.placeholder}
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.scanButton, { backgroundColor: c.accent }]}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="qr-code-outline" size={24} color={c.primaryButtonText} />
          </Pressable>
        </View>

        {contacts.length > 0 && (
          <>
            <Text style={[styles.contactsLabel, { color: c.secondaryText }]}>Contacts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.contactChips}
            >
              {contacts.map((contact) => (
                <Pressable
                  key={contact.id}
                  style={[styles.contactChip, { backgroundColor: c.accentSurface }]}
                  onPress={() => setRecipient(contact.name)}
                >
                  <Text style={[styles.contactChipText, { color: c.accent }]} numberOfLines={1}>
                    {contact.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.label, { color: c.secondaryText }]}>Send as</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[
              styles.modeButton,
              { borderColor: c.accent },
              sendMode === "private" && [styles.modeButtonActive, { backgroundColor: c.accent, borderColor: c.accent }],
            ]}
            onPress={() => setSendMode("private")}
          >
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={sendMode === "private" ? c.primaryButtonText : c.accent}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: sendMode === "private" ? c.primaryButtonText : c.accent },
              ]}
            >
              Private send
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              { borderColor: c.accent },
              sendMode === "decompress" && [styles.modeButtonActive, { backgroundColor: c.accent, borderColor: c.accent }],
            ]}
            onPress={() => setSendMode("decompress")}
          >
            <Ionicons
              name="arrow-down-circle-outline"
              size={18}
              color={sendMode === "decompress" ? c.primaryButtonText : c.accent}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: sendMode === "decompress" ? c.primaryButtonText : c.accent },
              ]}
            >
              Decompress to public
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: c.secondaryText }]}>Amount (SOL)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder="0.00"
          placeholderTextColor={c.placeholder}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        {transferError ? (
          <Text style={[styles.errorText, { color: c.warningBorder }]}>{transferError}</Text>
        ) : null}

        <Pressable
          style={[styles.sendButton, { backgroundColor: c.accent }, isSending && styles.disabledButton]}
          onPress={handleSend}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator color={c.primaryButtonText} />
          ) : (
            <Text style={[styles.sendButtonText, { color: c.primaryButtonText }]}>
              {sendMode === "decompress"
                ? "Decompress to public SOL"
                : "Send privately"}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <QRScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noWallet: { fontSize: 16, color: "#666" },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  balanceLabel: { fontSize: 14, color: "#666" },
  balanceValue: { fontSize: 18, fontWeight: "600", color: "#000" },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#fff",
  },
  recipientRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  recipientInput: { flex: 1 },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#34C759",
    backgroundColor: "transparent",
  },
  modeButtonActive: {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
  },
  modeButtonText: { fontSize: 14, fontWeight: "600", color: "#34C759" },
  modeButtonTextActive: { color: "#fff" },
  contactsLabel: { fontSize: 12, color: "#666", marginBottom: 8 },
  contactChips: { marginBottom: 16, maxHeight: 44 },
  contactChip: {
    backgroundColor: "#34C75920",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  contactChipText: { fontSize: 14, color: "#34C759", fontWeight: "500" },
  errorText: { fontSize: 13, color: "#c00", marginBottom: 12 },
  sendButton: {
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabledButton: { opacity: 0.6 },
});
