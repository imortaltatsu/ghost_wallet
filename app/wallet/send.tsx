import { getSolscanTxUrl } from "@/constants/network";
import { Colors } from "@/constants/theme";
import { useAddressBookStore } from "@/store/addressBookStore";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useWalletStore } from "@/store/walletStore";
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

/** Lazy-loaded QR scanner so expo-camera is only required when opened (avoids "Cannot find native module" at app load). */
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
              Camera is not available. Rebuild the app with a development build
              to enable QR scanning, or paste the address above.
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

export default function SendScreen() {
  const theme = useResolvedTheme();
  const c = Colors[theme];
  const { wallet, balance, sendSol, refreshBalance } = useWalletStore();
  const { contacts, loadContacts, addContact } = useAddressBookStore();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const handleScan = ({ data }: { data: string }) => {
    const trimmed = data?.trim() ?? "";
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
      Alert.alert("Error", "Enter or scan recipient address");
      return;
    }
    if (!isValidSolanaAddress(trimmedRecipient)) {
      Alert.alert("Error", "Invalid Solana address");
      return;
    }
    const val = parseFloat(amount);
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    if (val > balance) {
      Alert.alert("Error", "Insufficient balance");
      return;
    }
    try {
      setIsSending(true);
      const sig = await sendSol(trimmedRecipient, val);
      const sigStr = typeof sig === "string" ? sig : String(sig ?? "");
      Alert.alert("Sent", `${val} SOL sent.\n${sigStr.slice(0, 16)}…`, [
        { text: "OK" },
        {
          text: "View on Solscan",
          onPress: () => Linking.openURL(getSolscanTxUrl(sigStr)),
        },
      ]);
      setAmount("");
      setRecipient("");
      refreshBalance();
    } catch (e) {
      Alert.alert("Send failed", (e as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddContact = async () => {
    const trimmedRecipient = recipient.trim();
    const name = contactName.trim();
    if (!trimmedRecipient || !isValidSolanaAddress(trimmedRecipient)) {
      Alert.alert("Error", "Enter a valid address first");
      return;
    }
    if (!name) {
      Alert.alert("Error", "Enter a contact name");
      return;
    }
    await addContact(name, trimmedRecipient);
    setShowAddContact(false);
    setContactName("");
    Alert.alert("Saved", `${name} added to contacts`);
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
      <Stack.Screen options={{ title: "Send" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.balanceRow, { backgroundColor: c.card }]}>
          <Text style={[styles.balanceLabel, { color: c.secondaryText }]}>Available</Text>
          <Text style={[styles.balanceValue, { color: c.text }]}>{balance.toFixed(4)} SOL</Text>
        </View>

        <Text style={[styles.label, { color: c.secondaryText }]}>Recipient</Text>
        <View style={styles.recipientRow}>
          <TextInput
            style={[styles.input, styles.recipientInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
            placeholder="Solana address or scan QR"
            placeholderTextColor={c.placeholder}
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.scanButton, { backgroundColor: c.tint }]}
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
                  style={[styles.contactChip, { backgroundColor: c.card }]}
                  onPress={() => setRecipient(contact.address)}
                >
                  <Text style={[styles.contactChipText, { color: c.text }]} numberOfLines={1}>
                    {contact.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <Pressable
          style={styles.addContactLink}
          onPress={() => recipient.trim() && setShowAddContact(true)}
        >
          <Ionicons name="person-add-outline" size={18} color={c.tint} />
          <Text style={[styles.addContactLinkText, { color: c.tint }]}>Add to contacts</Text>
        </Pressable>

        <Text style={[styles.label, { color: c.secondaryText }]}>Amount (SOL)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder="0.00"
          placeholderTextColor={c.placeholder}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Pressable
          style={[styles.sendButton, { backgroundColor: c.tint }, isSending && styles.disabledButton]}
          onPress={handleSend}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator color={c.primaryButtonText} />
          ) : (
            <Text style={[styles.sendButtonText, { color: c.primaryButtonText }]}>Send SOL</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* QR Scanner Modal - lazy-loads expo-camera so app doesn't crash if native module missing */}
      <QRScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />

      {/* Add contact modal */}
      <Modal
        visible={showAddContact}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContact(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddContact(false)}
        >
          <Pressable
            style={[styles.modalBox, { backgroundColor: c.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.text }]}>Add to contacts</Text>
            <Text style={[styles.modalLabel, { color: c.secondaryText }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
              placeholder="Contact name"
              placeholderTextColor={c.placeholder}
              value={contactName}
              onChangeText={setContactName}
            />
            <Text style={[styles.modalLabel, { color: c.secondaryText }]}>Address</Text>
            <Text style={[styles.modalAddress, { color: c.text }]} numberOfLines={2}>
              {recipient}
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButtonCancel, { backgroundColor: c.border }]}
                onPress={() => setShowAddContact(false)}
              >
                <Text style={[styles.modalButtonCancelText, { color: c.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonSave, { backgroundColor: c.tint }]}
                onPress={handleAddContact}
              >
                <Text style={[styles.modalButtonSaveText, { color: c.primaryButtonText }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noWallet: { fontSize: 16, color: "#8E8E93" },
  balanceRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { fontSize: 13, color: "#8E8E93", fontWeight: "600" },
  balanceValue: { fontSize: 18, fontWeight: "bold", color: "#1C1C1E" },
  label: { fontSize: 12, color: "#8E8E93", marginBottom: 8, fontWeight: "600" },
  recipientRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  recipientInput: { flex: 1 },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  contactsLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8,
    fontWeight: "600",
  },
  contactChips: { flexDirection: "row", marginBottom: 16 },
  contactChip: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  contactChipText: { fontSize: 14, color: "#1C1C1E" },
  addContactLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  addContactLinkText: { fontSize: 15, color: "#007AFF", fontWeight: "500" },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabledButton: { opacity: 0.7 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 20 },
  modalLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8,
    fontWeight: "600",
  },
  modalAddress: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#1C1C1E",
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
  },
  modalButtonCancelText: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  modalButtonSaveText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
