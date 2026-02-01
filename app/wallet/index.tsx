import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useCompressedStore } from "@/store/compressedStore";
import { useWalletStore } from "@/store/walletStore";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey } from "@solana/web3.js";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function WalletScreen() {
  const router = useRouter();
  const theme = useResolvedTheme();
  const c = Colors[theme];
  const themed = useMemo(
    () => ({
      container: { backgroundColor: c.background },
      loadingText: { color: c.secondaryText },
      errorContainer: { backgroundColor: c.warningSurface + "40", borderColor: "#ef4444" },
      errorText: { color: "#ef4444" },
      emptyTitle: { color: c.text },
      emptyDesc: { color: c.secondaryText },
      card: { backgroundColor: c.card },
      balanceLabel: { color: c.secondaryText },
      balanceAmount: { color: c.text },
      balanceBreakdown: { borderTopColor: c.border },
      balanceBreakdownLabel: { color: c.secondaryText },
      balanceBreakdownValue: { color: c.text },
      addressContainer: { backgroundColor: c.inputBg },
      addressLabel: { color: c.text },
      menuSectionLabel: { color: c.secondaryText },
      primaryActionCard: { backgroundColor: c.card },
      primaryActionText: { color: c.text },
      primaryActionSubtext: { color: c.secondaryText },
      menuList: { backgroundColor: c.card },
      menuRow: { borderBottomColor: c.border },
      menuRowPressed: { backgroundColor: c.inputBg },
      menuRowTitle: { color: c.text },
      menuRowSubtitle: { color: c.secondaryText },
      primaryButton: { backgroundColor: c.tint },
      primaryButtonText: { color: c.primaryButtonText },
      secondaryButtonText: { color: c.tint },
      deleteButtonText: { color: "#ef4444" },
    }),
    [theme, c],
  );
  const {
    wallet,
    publicKey,
    balance,
    isLoading,
    error,
    createWallet,
    loadWallet,
    refreshBalance,
    deleteWallet,
  } = useWalletStore();
  const { compressedSolBalance, refresh: refreshCompressed } =
    useCompressedStore();

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    if (publicKey) {
      refreshCompressed(new PublicKey(publicKey));
    } else {
      refreshCompressed(null);
    }
  }, [publicKey, refreshCompressed]);

  // Refresh public balance when wallet screen is focused so displayed balance is up to date
  useFocusEffect(
    useCallback(() => {
      if (publicKey) {
        refreshBalance();
      }
    }, [publicKey, refreshBalance]),
  );

  const copyToClipboard = async () => {
    if (publicKey) {
      await Clipboard.setStringAsync(publicKey);
      Alert.alert("Copied", "Address copied to clipboard");
    }
  };

  const handleCreateWallet = () => {
    Alert.alert(
      "Create New Wallet",
      "This will create a new SOL wallet. Make sure to back up your seed phrase immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async () => {
            try {
              await createWallet();
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert("Wallet creation failed", msg);
            }
          },
        },
      ],
    );
  };

  const handleDeleteWallet = async () => {
    Alert.alert(
      "Delete Wallet",
      "Are you sure? Ensure you have your seed phrase backed up!",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteWallet },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, themed.container]}>
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.loadingText, themed.loadingText]}>Loading Wallet...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, themed.container]}>
      <Stack.Screen options={{ title: "Wallet", headerBackTitle: "Back" }} />

      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <View style={[styles.errorContainer, themed.errorContainer]}>
            <Text style={[styles.errorText, themed.errorText]}>{error}</Text>
          </View>
        )}

        {!wallet ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={80} color={c.icon} />
            <Text style={[styles.emptyTitle, themed.emptyTitle]}>No Wallet Found</Text>
            <Text style={[styles.emptyDesc, themed.emptyDesc]}>
              Create a new wallet or import an existing one to get started.
            </Text>

            <Pressable
              style={[styles.primaryButton, themed.primaryButton]}
              onPress={handleCreateWallet}
            >
              <Text style={[styles.primaryButtonText, themed.primaryButtonText]}>Create New Wallet</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                Alert.alert("Import", "Import feature coming soon")
              }
            >
              <Text style={[styles.secondaryButtonText, themed.secondaryButtonText]}>Import Wallet</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.card, themed.card]}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, themed.balanceLabel]}>Total Balance</Text>
                <Pressable
                  onPress={() => {
                    refreshBalance();
                    if (publicKey) refreshCompressed(new PublicKey(publicKey));
                  }}
                >
                  <Ionicons name="refresh" size={20} color={c.tint} />
                </Pressable>
              </View>
              <Text style={[styles.balanceAmount, themed.balanceAmount]}>
                {(balance + compressedSolBalance).toFixed(4)} SOL
              </Text>
              <View style={[styles.balanceBreakdown, themed.balanceBreakdown]}>
                <View style={styles.balanceBreakdownRow}>
                  <Text style={[styles.balanceBreakdownLabel, themed.balanceBreakdownLabel]}>Public</Text>
                  <Text style={[styles.balanceBreakdownValue, themed.balanceBreakdownValue]}>
                    {balance.toFixed(4)} SOL
                  </Text>
                </View>
                <View style={styles.balanceBreakdownRow}>
                  <Text style={[styles.balanceBreakdownLabel, themed.balanceBreakdownLabel]}>Private</Text>
                  <Text style={[styles.balanceBreakdownValue, themed.balanceBreakdownValue]}>
                    {compressedSolBalance.toFixed(4)} SOL
                  </Text>
                </View>
              </View>
              <View style={[styles.addressContainer, themed.addressContainer]}>
                <Text style={[styles.addressLabel, themed.addressLabel]}>
                  {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                </Text>
                <Pressable onPress={copyToClipboard}>
                  <Ionicons name="copy-outline" size={16} color={c.placeholder} />
                </Pressable>
              </View>
            </View>

            {/* Primary: Send, Receive, Private send — vertical full-width buttons */}
            <Text style={[styles.menuSectionLabel, themed.menuSectionLabel]}>Pay</Text>
            <View style={styles.primaryActionsColumn}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionCard,
                  themed.primaryActionCard,
                  pressed && styles.primaryActionCardPressed,
                ]}
                onPress={() => router.push("/wallet/send")}
              >
                <View
                  style={[styles.primaryActionIcon, { backgroundColor: c.tint }]}
                >
                  <Ionicons name="paper-plane" size={24} color={c.primaryButtonText} />
                </View>
                <View style={styles.primaryActionTextWrap}>
                  <Text style={[styles.primaryActionText, themed.primaryActionText]}>Send</Text>
                  <Text style={[styles.primaryActionSubtext, themed.primaryActionSubtext]}>SOL or tokens</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionCard,
                  themed.primaryActionCard,
                  pressed && styles.primaryActionCardPressed,
                ]}
                onPress={() => router.push("/wallet/receive")}
              >
                <View
                  style={[styles.primaryActionIcon, { backgroundColor: c.accentBorder }]}
                >
                  <Ionicons name="qr-code" size={24} color="#fff" />
                </View>
                <View style={styles.primaryActionTextWrap}>
                  <Text style={[styles.primaryActionText, themed.primaryActionText]}>Receive</Text>
                  <Text style={[styles.primaryActionSubtext, themed.primaryActionSubtext]}>Show address</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionCard,
                  themed.primaryActionCard,
                  pressed && styles.primaryActionCardPressed,
                ]}
                onPress={() => router.push("/wallet/private-send")}
              >
                <View
                  style={[styles.primaryActionIcon, { backgroundColor: "#34C759" }]}
                >
                  <Ionicons name="shield-checkmark" size={24} color="#fff" />
                </View>
                <View style={styles.primaryActionTextWrap}>
                  <Text style={[styles.primaryActionText, themed.primaryActionText]}>Private send</Text>
                  <Text style={[styles.primaryActionSubtext, themed.primaryActionSubtext]}>Compressed SOL</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
              </Pressable>
            </View>

            {/* Menu list: Private, Contacts */}
            <Text style={[styles.menuSectionLabel, themed.menuSectionLabel]}>Manage</Text>
            <View style={[styles.menuList, themed.menuList]}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuRow,
                  themed.menuRow,
                  pressed && themed.menuRowPressed,
                ]}
                onPress={() => router.push("/wallet/shielded")}
              >
                <View
                  style={[styles.menuRowIcon, { backgroundColor: "#34C75920" }]}
                >
                  <Ionicons name="shield-checkmark" size={22} color="#34C759" />
                </View>
                <View style={styles.menuRowText}>
                  <Text style={[styles.menuRowTitle, themed.menuRowTitle]}>Private</Text>
                  <Text style={[styles.menuRowSubtitle, themed.menuRowSubtitle]}>Compressed tokens</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.menuRow,
                  styles.menuRowLast,
                  themed.menuRow,
                  pressed && themed.menuRowPressed,
                ]}
                onPress={() => router.push("/wallet/address-book")}
              >
                <View
                  style={[styles.menuRowIcon, { backgroundColor: "#FF950020" }]}
                >
                  <Ionicons name="book" size={22} color="#FF9500" />
                </View>
                <View style={styles.menuRowText}>
                  <Text style={[styles.menuRowTitle, themed.menuRowTitle]}>Contacts</Text>
                  <Text style={[styles.menuRowSubtitle, themed.menuRowSubtitle]}>Address book</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
              </Pressable>
            </View>

            <Pressable style={styles.deleteButton} onPress={handleDeleteWallet}>
              <Text style={[styles.deleteButtonText, themed.deleteButtonText]}>Delete Wallet</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 10,
    color: "#8E8E93",
  },
  errorContainer: {
    backgroundColor: "#FF3B301A",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  balanceBreakdown: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  balanceBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  balanceBreakdownLabel: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  balanceBreakdownValue: {
    fontSize: 15,
    color: "#3C3C43",
    fontWeight: "600",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    color: "#3C3C43",
    fontFamily: "Courier",
  },
  menuSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  primaryActionsColumn: {
    gap: 10,
    marginBottom: 24,
  },
  primaryActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionCardPressed: {
    opacity: 0.9,
  },
  primaryActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  primaryActionTextWrap: {
    flex: 1,
  },
  primaryActionText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  primaryActionSubtext: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  menuList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  menuRowPressed: {
    backgroundColor: "#F9F9F9",
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuRowText: {
    flex: 1,
  },
  menuRowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  menuRowSubtitle: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    marginTop: 40,
    alignSelf: "center",
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
  },
});
