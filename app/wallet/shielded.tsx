import { getSolscanTxUrl, USE_COMPRESSION_INDEXER } from "@/constants/network";
import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { useCompressedStore } from "@/store/compressedStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useWalletStore } from "@/store/walletStore";
import { getErrorMessage } from "@/utils/error";
import { Ionicons } from "@expo/vector-icons";
import { Connection, PublicKey } from "@solana/web3.js";
import { Stack, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
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

const WALLET_SUPPORT_DOCS_URL =
  "https://www.zkcompression.com/compressed-tokens/advanced-guides/add-wallet-support-for-compressed-tokens";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export type TokenBalanceItem = { mint: string; balance: number; decimals?: number };

export default function PrivateScreen() {
  const theme = useResolvedTheme();
  const c = Colors[theme];
  const router = useRouter();
  const {
    wallet,
    balance: publicBalance,
    refreshBalance: refreshPublic,
  } = useWalletStore();
  const {
    compressedSolBalance,
    compressedTokenBalances,
    error: compressedError,
    isRefreshing: compressedRefreshing,
    refresh: refreshCompressed,
    compressSol,
    decompressSol,
    decompressToken,
    compressToken,
    createTokenPool,
    transferError: compressedTransferError,
    clearTransferError: clearCompressedTransferError,
  } = useCompressedStore();

  const [convertAmount, setConvertAmount] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [decompressSolAmount, setDecompressSolAmount] = useState("");
  const [isDecompressingSol, setIsDecompressingSol] = useState(false);
  const [compressMint, setCompressMint] = useState("");
  const [compressAmount, setCompressAmount] = useState("");
  const [isCompressingToken, setIsCompressingToken] = useState(false);
  const [showCompressMintPicker, setShowCompressMintPicker] = useState(false);
  const [decompressMint, setDecompressMint] = useState("");
  const [decompressAmount, setDecompressAmount] = useState("");
  const [isDecompressing, setIsDecompressing] = useState(false);
  const [showDecompressMintPicker, setShowDecompressMintPicker] = useState(false);
  const [publicTokenAccounts, setPublicTokenAccounts] = useState<TokenBalanceItem[]>([]);
  const [customMintInput, setCustomMintInput] = useState("");
  const [customDecompressMintInput, setCustomDecompressMintInput] = useState("");
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  const publicKeyBase58 = wallet?.publicKey?.toBase58() ?? null;
  const screenOptions = useMemo(() => ({ title: "Private" }), []);

  useEffect(() => {
    if (!publicKeyBase58) {
      refreshCompressed(null);
      return;
    }
    const id = setTimeout(() => {
      refreshCompressed(new PublicKey(publicKeyBase58));
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKeyBase58]);


  const getRpcUrl = useSettingsStore((s) => s.getRpcUrl);

  useEffect(() => {
    if (!publicKeyBase58) {
      setPublicTokenAccounts([]);
      return;
    }
    let cancelled = false;
    const conn = new Connection(getRpcUrl());
    conn
      .getParsedTokenAccountsByOwner(new PublicKey(publicKeyBase58), {
        programId: TOKEN_PROGRAM_ID,
      })
      .then((res) => {
        if (cancelled) return;
        const list: TokenBalanceItem[] = res.value
          .map((v): TokenBalanceItem | null => {
            const info = v.account?.data?.parsed?.info;
            if (!info?.mint) return null;
            const amount = info.tokenAmount?.amount ?? "0";
            const decimals = info.tokenAmount?.decimals ?? 0;
            const balance = Number(amount);
            if (balance === 0) return null;
            return { mint: info.mint as string, balance, decimals };
          })
          .filter((t): t is TokenBalanceItem => t != null);
        setPublicTokenAccounts(list);
      })
      .catch(() => {
        if (!cancelled) setPublicTokenAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKeyBase58, getRpcUrl]);

  const handleConvertToPrivate = async () => {
    if (!wallet || !convertAmount.trim()) {
      Alert.alert("Invalid", "Enter an amount to convert.");
      return;
    }
    const val = Number(convertAmount);
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert("Invalid Amount");
      return;
    }
    if (val > publicBalance) {
      Alert.alert("Insufficient public balance");
      return;
    }
    try {
      clearCompressedTransferError();
      setIsConverting(true);
      const sig = await compressSol(wallet, wallet, val);
      Alert.alert(
        "Success",
        `${val} SOL converted to private.\n${sig.slice(0, 16)}…\n\nPrivate balance may take a few seconds to update.`,
        [
          { text: "OK" },
          {
            text: "View on Solscan",
            onPress: () => Linking.openURL(getSolscanTxUrl(sig)),
          },
        ],
      );
      setConvertAmount("");
      refreshPublic();
      // Refresh immediately, then retry after indexer delay (compression indexer can lag)
      if (wallet.publicKey) {
        await refreshCompressed(wallet.publicKey);
        setTimeout(() => refreshCompressed(wallet.publicKey!), 2000);
        setTimeout(() => refreshCompressed(wallet.publicKey!), 5000);
      }
    } catch (e) {
      Alert.alert("Convert failed", getErrorMessage(e));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDecompressSol = async () => {
    if (!wallet || !decompressSolAmount.trim()) {
      Alert.alert("Invalid", "Enter an amount to decompress.");
      return;
    }
    const val = Number(decompressSolAmount);
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert("Invalid Amount");
      return;
    }
    if (val > compressedSolBalance) {
      Alert.alert("Insufficient private SOL balance");
      return;
    }
    try {
      clearCompressedTransferError();
      setIsDecompressingSol(true);
      const recipient = wallet.publicKey!;
      const sig = await decompressSol(wallet, val, recipient);
      Alert.alert(
        "Success",
        `${val} SOL decompressed to public.\n${sig.slice(0, 16)}…\n\nPublic balance may take a few seconds to update.`,
        [
          { text: "OK" },
          {
            text: "View on Solscan",
            onPress: () => Linking.openURL(getSolscanTxUrl(sig)),
          },
        ],
      );
      setDecompressSolAmount("");
      refreshPublic();
      if (wallet.publicKey) {
        await refreshCompressed(wallet.publicKey);
        setTimeout(() => refreshCompressed(wallet.publicKey!), 2000);
      }
    } catch (e) {
      Alert.alert("Decompress failed", getErrorMessage(e));
    } finally {
      setIsDecompressingSol(false);
    }
  };

  const handleCreateTokenPool = async () => {
    if (!wallet || !compressMint.trim()) {
      Alert.alert("Invalid", "Select a mint first.");
      return;
    }
    try {
      clearCompressedTransferError();
      setIsCreatingPool(true);
      const sig = await createTokenPool(wallet, new PublicKey(compressMint.trim()));
      Alert.alert(
        "Pool created",
        `You can now compress this mint.\n${sig.slice(0, 16)}…`,
        [
          { text: "OK" },
          { text: "View on Solscan", onPress: () => Linking.openURL(getSolscanTxUrl(sig)) },
        ],
      );
    } catch (e) {
      Alert.alert("Create pool failed", getErrorMessage(e));
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleCompressToken = async () => {
    if (!wallet || !compressMint.trim() || !compressAmount.trim()) {
      Alert.alert("Invalid", "Mint and amount are required.");
      return;
    }
    const val = Number(compressAmount);
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert("Invalid Amount");
      return;
    }
    const decimals = publicTokenAccounts.find((b) => b.mint === compressMint)?.decimals;
    const amountRaw =
      decimals != null ? Math.floor(val * Math.pow(10, decimals)) : Math.floor(val);
    try {
      clearCompressedTransferError();
      setIsCompressingToken(true);
      const sig = await compressToken(
        wallet,
        wallet,
        new PublicKey(compressMint.trim()),
        amountRaw,
      );
      Alert.alert(
        "Success",
        `Tokens compressed to private.\n${sig.slice(0, 16)}…`,
        [
          { text: "OK" },
          { text: "View on Solscan", onPress: () => Linking.openURL(getSolscanTxUrl(sig)) },
        ],
      );
      setCompressMint("");
      setCompressAmount("");
      if (wallet.publicKey) refreshCompressed(wallet.publicKey);
    } catch (e) {
      Alert.alert("Compress failed", getErrorMessage(e));
    } finally {
      setIsCompressingToken(false);
    }
  };

  const handleDecompressToken = async () => {
    if (!wallet || !decompressMint.trim() || !decompressAmount.trim()) {
      Alert.alert("Invalid", "Mint and amount are required.");
      return;
    }
    const val = Number(decompressAmount);
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert("Invalid Amount");
      return;
    }
    const balanceForMint = compressedTokenBalances.find((b) => b.mint === decompressMint);
    const decimals = balanceForMint?.decimals;
    const amountRaw =
      decimals != null ? Math.floor(val * Math.pow(10, decimals)) : val;
    const maxHuman =
      balanceForMint && decimals != null
        ? balanceForMint.balance / Math.pow(10, decimals)
        : (balanceForMint?.balance ?? 0);
    if (
      balanceForMint &&
      (decimals != null ? val > maxHuman : val > balanceForMint.balance)
    ) {
      Alert.alert("Insufficient compressed token balance");
      return;
    }
    try {
      clearCompressedTransferError();
      setIsDecompressing(true);
      const sig = await decompressToken(
        wallet,
        wallet,
        new PublicKey(decompressMint.trim()),
        amountRaw,
      );
      Alert.alert(
        "Success",
        `Tokens decompressed to SPL.\n${sig.slice(0, 16)}…`,
        [
          { text: "OK" },
          { text: "View on Solscan", onPress: () => Linking.openURL(getSolscanTxUrl(sig)) },
        ],
      );
      setDecompressMint("");
      setDecompressAmount("");
      if (wallet.publicKey) refreshCompressed(wallet.publicKey);
    } catch (e) {
      Alert.alert("Decompress failed", getErrorMessage(e));
    } finally {
      setIsDecompressing(false);
    }
  };

  if (!wallet) {
    return (
      <View style={[styles.emptyState, { backgroundColor: c.background }]}>
        <View style={styles.emptyStateIconWrap}>
          <Ionicons name="wallet-outline" size={48} color={c.secondaryText} />
        </View>
        <Text style={[styles.emptyStateTitle, { color: c.text }]}>No wallet</Text>
        <Text style={[styles.emptyStateText, { color: c.secondaryText }]}>
          Create or import a wallet from the main Wallet screen to use private SOL.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <Stack.Screen options={screenOptions} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Primary balance */}
        <Text style={[styles.sectionOverline, { color: c.secondaryText }]}>Overview</Text>
        <Pressable
          style={({ pressed }) => [
            styles.heroCard,
            { backgroundColor: c.card },
            pressed && styles.balanceRowPressed,
          ]}
          onPress={() =>
            wallet?.publicKey && refreshCompressed(wallet.publicKey)
          }
        >
          <View style={styles.heroPrimaryRow}>
            <View style={[styles.balanceIconWrap, { backgroundColor: c.accentSurface }]}>
              <Ionicons name="shield-checkmark" size={28} color={c.accent} />
            </View>
            <View style={styles.heroBalanceContent}>
              <Text style={[styles.balanceLabel, { color: c.secondaryText }]}>Private SOL</Text>
              <Text style={[styles.heroBalanceValue, { color: c.text }]}>
                {compressedRefreshing
                  ? "..."
                  : USE_COMPRESSION_INDEXER
                    ? `${compressedSolBalance.toFixed(4)}`
                    : "—"}{" "}
                <Text style={[styles.heroBalanceUnit, { color: c.secondaryText }]}>SOL</Text>
              </Text>
              <Text style={[styles.balanceSubtext, { color: c.secondaryText }]}>
                {USE_COMPRESSION_INDEXER
                  ? "Tap to refresh"
                  : "Private balance; may show 0 until indexer is set."}
              </Text>
            </View>
            <Ionicons name="refresh" size={22} color={c.secondaryText} />
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.balanceRow}>
            <View style={[styles.balanceIconWrap, { backgroundColor: c.accentSurface }]}>
              <Ionicons name="wallet-outline" size={20} color={c.tint} />
            </View>
            <View style={styles.balanceContent}>
              <Text style={[styles.balanceLabel, { color: c.secondaryText }]}>Public SOL</Text>
              <Text style={[styles.balanceValueSecondary, { color: c.text }]}>
                {publicBalance.toFixed(4)} SOL
              </Text>
            </View>
          </View>
          {compressedTokenBalances.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={[styles.tokenSectionLabel, { color: c.secondaryText }]}>Private (compressed) tokens</Text>
              {compressedTokenBalances.map((t) => (
                <View key={t.mint} style={[styles.tokenMintRow, { borderBottomColor: c.border }]}>
                  <Text style={[styles.tokenMintAddress, { color: c.text }]} selectable numberOfLines={1}>
                    {t.mint}
                  </Text>
                  <Text style={[styles.tokenMintBalance, { color: c.secondaryText }]}>
                    {t.decimals != null
                      ? (t.balance / Math.pow(10, t.decimals)).toFixed(4)
                      : String(t.balance)}
                  </Text>
                </View>
              ))}
            </>
          )}
          {publicTokenAccounts.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={[styles.tokenSectionLabel, { color: c.secondaryText }]}>Public (SPL) tokens</Text>
              {publicTokenAccounts.map((t) => (
                <View key={t.mint} style={[styles.tokenMintRow, { borderBottomColor: c.border }]}>
                  <Text style={[styles.tokenMintAddress, { color: c.text }]} selectable numberOfLines={1}>
                    {t.mint}
                  </Text>
                  <Text style={[styles.tokenMintBalance, { color: c.secondaryText }]}>
                    {t.decimals != null
                      ? (t.balance / Math.pow(10, t.decimals)).toFixed(4)
                      : String(t.balance)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Pressable>

        {/* Quick actions */}
        <Text style={[styles.sectionOverline, { color: c.secondaryText }]}>Actions</Text>
        <View style={[styles.convertCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.convertHeader}>
            <View style={[styles.convertIconWrap, { backgroundColor: c.accentSurface }]}>
              <Ionicons name="arrow-down-circle" size={24} color={c.accent} />
            </View>
            <View style={styles.convertHeaderText}>
              <Text style={[styles.convertTitle, { color: c.text }]}>Convert to private</Text>
              <Text style={[styles.convertSubtext, { color: c.secondaryText }]}>
                Move public SOL into your private balance. Then send to private or to public.
              </Text>
            </View>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
            placeholder="Amount (SOL)"
            placeholderTextColor={c.placeholder}
            keyboardType="numeric"
            value={convertAmount}
            onChangeText={setConvertAmount}
          />
          {compressedTransferError && (
            <Text style={[styles.errorText, { color: c.warningBorder }]}>{compressedTransferError}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.convertButton,
              { backgroundColor: c.accent },
              isConverting && styles.disabledButton,
              pressed && !isConverting && styles.buttonPressed,
            ]}
            onPress={handleConvertToPrivate}
            disabled={isConverting}
          >
            {isConverting ? (
              <ActivityIndicator color={c.primaryButtonText} size="small" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color={c.primaryButtonText} style={{ marginRight: 8 }} />
                <Text style={[styles.convertButtonText, { color: c.primaryButtonText }]}>Convert to private SOL</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={[styles.convertCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.convertHeader}>
            <View style={[styles.convertIconWrap, { backgroundColor: c.accentSurface }]}>
              <Ionicons name="arrow-up-circle" size={24} color={c.tint} />
            </View>
            <View style={styles.convertHeaderText}>
              <Text style={[styles.convertTitle, { color: c.text }]}>Decompress to public</Text>
              <Text style={[styles.convertSubtext, { color: c.secondaryText }]}>
                Move private SOL back to your public (native) balance.
              </Text>
            </View>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
            placeholder="Amount (SOL)"
            placeholderTextColor={c.placeholder}
            keyboardType="numeric"
            value={decompressSolAmount}
            onChangeText={setDecompressSolAmount}
          />
          {compressedTransferError && (
            <Text style={[styles.errorText, { color: c.warningBorder }]}>{compressedTransferError}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.convertButton,
              { backgroundColor: c.accent },
              isDecompressingSol && styles.disabledButton,
              pressed && !isDecompressingSol && styles.buttonPressed,
            ]}
            onPress={handleDecompressSol}
            disabled={isDecompressingSol}
          >
            {isDecompressingSol ? (
              <ActivityIndicator color={c.primaryButtonText} size="small" />
            ) : (
              <>
                <Ionicons name="lock-open" size={20} color={c.primaryButtonText} style={{ marginRight: 8 }} />
                <Text style={[styles.convertButtonText, { color: c.primaryButtonText }]}>Decompress to public SOL</Text>
              </>
            )}
          </Pressable>
        </View>

        {compressedError && (
          <View style={[styles.errorBanner, { backgroundColor: c.warningSurface, borderColor: c.warningBorder }]}>
            <Text style={[styles.errorBannerText, { color: c.secondaryText }]}>{compressedError}</Text>
            <Pressable
              style={styles.docLink}
              onPress={() =>
                WebBrowser.openBrowserAsync(WALLET_SUPPORT_DOCS_URL, {
                  presentationStyle:
                    WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                })
              }
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={c.tint}
              />
              <Text style={[styles.docLinkText, { color: c.tint }]}>Add wallet support docs</Text>
            </Pressable>
          </View>
        )}

        {/* Compress token (SPL → private) */}
        <Text style={[styles.sectionOverline, { marginTop: 8 }]}>Compress token</Text>
        <View style={styles.convertCard}>
          <Text style={styles.subsectionLabel}>Mint (public SPL token)</Text>
          <Pressable
            style={styles.mintPickerButton}
            onPress={() => {
              setCustomMintInput("");
              setShowCompressMintPicker(true);
            }}
          >
            <Text
              style={[
                styles.mintPickerButtonText,
                !compressMint && styles.mintPickerPlaceholder,
              ]}
              numberOfLines={1}
            >
              {compressMint
                ? `${compressMint.slice(0, 8)}…${compressMint.slice(-8)}`
                : "Select mint address"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Amount (human-readable)"
            placeholderTextColor={c.placeholder}
            keyboardType="numeric"
            value={compressAmount}
            onChangeText={setCompressAmount}
          />
          {compressedTransferError && (
            <Text style={styles.errorText}>{compressedTransferError}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.convertButton,
              isCompressingToken && styles.disabledButton,
              pressed && !isCompressingToken && styles.buttonPressed,
            ]}
            onPress={handleCompressToken}
            disabled={isCompressingToken}
          >
            {isCompressingToken ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.convertButtonText}>Compress token</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.submitButtonSecondary,
              isCreatingPool && styles.disabledButton,
              pressed && !isCreatingPool && styles.buttonPressedSecondary,
            ]}
            onPress={handleCreateTokenPool}
            disabled={isCreatingPool}
          >
            {isCreatingPool ? (
              <ActivityIndicator color="#34C759" size="small" />
            ) : (
              <Text style={styles.submitButtonSecondaryText}>Create pool (if needed)</Text>
            )}
          </Pressable>
        </View>

        {/* Compress mint picker modal */}
        <Modal
          visible={showCompressMintPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCompressMintPicker(false)}
        >
          <Pressable
            style={styles.mintPickerBackdrop}
            onPress={() => setShowCompressMintPicker(false)}
          >
            <Pressable
              style={styles.mintPickerSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.mintPickerTitle}>Select mint (public SPL)</Text>
              <ScrollView
                style={styles.mintPickerList}
                keyboardShouldPersistTaps="handled"
              >
                {publicTokenAccounts.length > 0 && (
                  <>
                    <Text style={styles.mintPickerSectionLabel}>Public (SPL)</Text>
                    {publicTokenAccounts.map((t) => (
                      <Pressable
                        key={t.mint}
                        style={[
                          styles.mintPickerItem,
                          compressMint === t.mint && styles.mintPickerItemSelected,
                        ]}
                        onPress={() => {
                          setCompressMint(t.mint);
                          setShowCompressMintPicker(false);
                        }}
                      >
                        <Text style={styles.mintPickerItemMint} numberOfLines={1}>
                          {t.mint}
                        </Text>
                        <Text style={styles.mintPickerItemBalance}>
                          Balance:{" "}
                          {t.decimals != null
                            ? (t.balance / Math.pow(10, t.decimals)).toFixed(4)
                            : String(t.balance)}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
                <Text style={styles.mintPickerSectionLabel}>Custom address</Text>
                <View style={styles.mintPickerCustomRow}>
                  <TextInput
                    style={styles.mintPickerCustomInput}
                    placeholder="Paste mint address"
                    placeholderTextColor={c.placeholder}
                    value={customMintInput}
                    onChangeText={setCustomMintInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={[
                      styles.mintPickerUseCustom,
                      !customMintInput.trim() && styles.mintPickerUseCustomDisabled,
                    ]}
                    onPress={() => {
                      const addr = customMintInput.trim();
                      if (addr) {
                        try {
                          new PublicKey(addr);
                          setCompressMint(addr);
                          setShowCompressMintPicker(false);
                        } catch {
                          Alert.alert("Invalid", "Not a valid Solana address.");
                        }
                      }
                    }}
                    disabled={!customMintInput.trim()}
                  >
                    <Text style={styles.mintPickerUseCustomText}>Use this address</Text>
                  </Pressable>
                </View>
              </ScrollView>
              <Pressable
                style={styles.mintPickerClose}
                onPress={() => setShowCompressMintPicker(false)}
              >
                <Text style={styles.mintPickerCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Decompress token (private → SPL) */}
        <Text style={[styles.sectionOverline, { marginTop: 8 }]}>Decompress token</Text>
        <View style={styles.convertCard}>
          <Text style={styles.subsectionLabel}>Mint (private compressed token)</Text>
          <Pressable
            style={styles.mintPickerButton}
            onPress={() => {
              setCustomDecompressMintInput("");
              setShowDecompressMintPicker(true);
            }}
          >
            <Text
              style={[
                styles.mintPickerButtonText,
                !decompressMint && styles.mintPickerPlaceholder,
              ]}
              numberOfLines={1}
            >
              {decompressMint
                ? `${decompressMint.slice(0, 8)}…${decompressMint.slice(-8)}`
                : "Select mint address"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Amount (human-readable)"
            placeholderTextColor={c.placeholder}
            keyboardType="numeric"
            value={decompressAmount}
            onChangeText={setDecompressAmount}
          />
          {compressedTransferError && (
            <Text style={styles.errorText}>{compressedTransferError}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.convertButton,
              isDecompressing && styles.disabledButton,
              pressed && !isDecompressing && styles.buttonPressed,
            ]}
            onPress={handleDecompressToken}
            disabled={isDecompressing}
          >
            {isDecompressing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="lock-open" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.convertButtonText}>Decompress token</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Decompress mint picker modal */}
        <Modal
          visible={showDecompressMintPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDecompressMintPicker(false)}
        >
          <Pressable
            style={styles.mintPickerBackdrop}
            onPress={() => setShowDecompressMintPicker(false)}
          >
            <Pressable
              style={styles.mintPickerSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.mintPickerTitle}>Select mint (private compressed)</Text>
              <ScrollView
                style={styles.mintPickerList}
                keyboardShouldPersistTaps="handled"
              >
                {compressedTokenBalances.length > 0 && (
                  <>
                    <Text style={styles.mintPickerSectionLabel}>Private (compressed)</Text>
                    {compressedTokenBalances.map((t) => (
                      <Pressable
                        key={t.mint}
                        style={[
                          styles.mintPickerItem,
                          decompressMint === t.mint && styles.mintPickerItemSelected,
                        ]}
                        onPress={() => {
                          setDecompressMint(t.mint);
                          setShowDecompressMintPicker(false);
                        }}
                      >
                        <Text style={styles.mintPickerItemMint} numberOfLines={1}>
                          {t.mint}
                        </Text>
                        <Text style={styles.mintPickerItemBalance}>
                          Balance:{" "}
                          {t.decimals != null
                            ? (t.balance / Math.pow(10, t.decimals)).toFixed(4)
                            : String(t.balance)}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
                <Text style={styles.mintPickerSectionLabel}>Custom address</Text>
                <View style={styles.mintPickerCustomRow}>
                  <TextInput
                    style={styles.mintPickerCustomInput}
                    placeholder="Paste mint address"
                    placeholderTextColor={c.placeholder}
                    value={customDecompressMintInput}
                    onChangeText={setCustomDecompressMintInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={[
                      styles.mintPickerUseCustom,
                      !customDecompressMintInput.trim() && styles.mintPickerUseCustomDisabled,
                    ]}
                    onPress={() => {
                      const addr = customDecompressMintInput.trim();
                      if (addr) {
                        try {
                          new PublicKey(addr);
                          setDecompressMint(addr);
                          setShowDecompressMintPicker(false);
                        } catch {
                          Alert.alert("Invalid", "Not a valid Solana address.");
                        }
                      }
                    }}
                    disabled={!customDecompressMintInput.trim()}
                  >
                    <Text style={styles.mintPickerUseCustomText}>Use this address</Text>
                  </Pressable>
                </View>
              </ScrollView>
              <Pressable
                style={styles.mintPickerClose}
                onPress={() => setShowDecompressMintPicker(false)}
              >
                <Text style={styles.mintPickerCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  heroBalanceContent: {
    flex: 1,
    marginLeft: 14,
  },
  heroBalanceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.5,
  },
  heroBalanceUnit: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6C6C70",
  },
  balanceValueSecondary: {
    fontSize: 17,
    fontWeight: "600",
    color: "#3C3C43",
  },
  subsectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 10,
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F2F2F7",
  },
  emptyStateIconWrap: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#6C6C70",
    textAlign: "center",
    lineHeight: 22,
  },
  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  balanceRowPressed: {
    opacity: 0.7,
  },
  balanceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  balanceIconWrapPrivate: {
    backgroundColor: "#E8F5E9",
  },
  balanceContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 10,
  },
  balanceLabel: {
    fontSize: 11,
    color: "#6C6C70",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  balanceSubtext: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 6,
    marginTop: 2,
  },
  tokenSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3C3C43",
    marginBottom: 8,
    marginTop: 4,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  tokenMintRow: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  tokenMintAddress: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#1C1C1E",
  },
  tokenMintBalance: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
  },
  subtext: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
    marginBottom: 8,
  },
  convertCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  convertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  convertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  convertHeaderText: {
    flex: 1,
  },
  convertTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 10,
  },
  convertSubtext: {
    fontSize: 14,
    color: "#6C6C70",
    lineHeight: 20,
    marginBottom: 20,
  },
  convertButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonPressedSecondary: {
    opacity: 0.85,
  },
  convertButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorBanner: {
    backgroundColor: "#FFF3F3",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  errorBannerText: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 12,
  },
  docLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  docLinkText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
  },
  recipientHint: {
    fontSize: 13,
    color: "#6C6C70",
    marginBottom: 8,
    marginTop: 4,
  },
  mintHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 12,
    marginTop: 2,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E8F4FF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#B3D9FF",
  },
  noteBoxPrivacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#1C1C1E",
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#F2F2F7",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  mintPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2F2F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  mintPickerButtonText: {
    fontSize: 16,
    color: "#000",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    flex: 1,
  },
  mintPickerPlaceholder: {
    color: "#8E8E93",
  },
  mintPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  mintPickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  mintPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    padding: 20,
    paddingBottom: 12,
  },
  mintPickerList: {
    maxHeight: 320,
  },
  mintPickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  mintPickerItemSelected: {
    backgroundColor: "#E8F5E9",
  },
  mintPickerItemMint: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#1C1C1E",
  },
  mintPickerItemBalance: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
  },
  mintPickerItemCustom: {
    fontSize: 14,
    color: "#007AFF",
  },
  mintPickerClose: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#E5E5EA",
    borderRadius: 12,
    alignItems: "center",
  },
  mintPickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  mintPickerSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  mintPickerCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  mintPickerCustomInput: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  mintPickerUseCustom: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#34C759",
  },
  mintPickerUseCustomDisabled: {
    backgroundColor: "#C7C7CC",
  },
  mintPickerUseCustomText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  contactChips: {
    marginBottom: 12,
  },
  contactChip: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  contactChipText: {
    fontSize: 12,
    color: "#3C3C43",
  },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonSecondary: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#34C759",
  },
  submitButtonSecondaryText: {
    color: "#34C759",
    fontSize: 16,
    fontWeight: "600",
  },
  addContactLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  addContactLinkText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
  },
  receiveResult: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  receiveAddress: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#1C1C1E",
    marginTop: 8,
  },
  receiveBalance: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
