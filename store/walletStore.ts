// Must run before bip39/SecureStore so wallet creation has crypto.getRandomValues
import "react-native-get-random-values";
// Ensure RPC fetch wrapper is active so getLatestBlockhash / RPC calls don't hit "json parse error" in RN
import "@/utils/polyfills";

import {
  confirmTransactionRpc,
  getBalanceLamports,
  getLatestBlockhash,
  requestAirdropRpc,
  sendTransactionBase64,
} from "@/services/rpc/solanaRpcClient";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { Buffer } from "buffer";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { useSettingsStore } from "@/store/settingsStore";
import { resolveRecipientToAddress } from "@/utils/recipientResolution";

// Ensure globals for web3.js (react-native-get-random-values above sets crypto.getRandomValues for bip39)
global.Buffer = global.Buffer || Buffer;

const STORE_KEY_MNEMONIC = "ghostwallet_mnemonic";
const STORE_KEY_SECRET = "ghostwallet_secret_key";

/** Interval for background refresh of public SOL balance (same as private balance). */
const PUBLIC_BALANCE_REFRESH_INTERVAL_MS = 30_000;

let publicBalanceRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Current RPC URL from settings (for tools). */
export function getConnectionUrl(): string {
  return useSettingsStore.getState().getRpcUrl();
}

interface WalletState {
  wallet: Keypair | null;
  publicKey: string | null;
  balance: number;
  isLoading: boolean;
  error: string | null;

  createWallet: () => Promise<void>;
  importWallet: (mnemonic: string) => Promise<void>;
  /** Restore wallet from base58-encoded secret key (64 bytes). */
  importFromPrivateKey: (secretKeyBase58: string) => Promise<void>;
  loadWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  requestAirdrop: () => Promise<void>;
  sendSol: (toAddress: string, amountSol: number) => Promise<string>;
  deleteWallet: () => Promise<void>;
  /** Get current wallet secret key as base58; returns null if no wallet. */
  getPrivateKeyBase58: () => string | null;
  /** Get mnemonic if wallet was created/imported from mnemonic; null if imported from private key. */
  getMnemonic: () => Promise<string | null>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  publicKey: null,
  balance: 0,
  isLoading: false,
  error: null,

  createWallet: async () => {
    set({ isLoading: true, error: null });
    try {
      await SecureStore.deleteItemAsync(STORE_KEY_SECRET);
      const mnemonic = bip39.generateMnemonic();
      await SecureStore.setItemAsync(STORE_KEY_MNEMONIC, mnemonic);

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Keypair.fromSeed(new Uint8Array(seed.slice(0, 32)));

      set({
        wallet: keypair,
        publicKey: keypair.publicKey.toString(),
      });

      await get().refreshBalance();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  importWallet: async (mnemonic: string) => {
    try {
      set({ isLoading: true, error: null });
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic phrase");
      }

      await SecureStore.deleteItemAsync(STORE_KEY_SECRET);
      await SecureStore.setItemAsync(STORE_KEY_MNEMONIC, mnemonic);

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Keypair.fromSeed(new Uint8Array(seed.slice(0, 32)));

      set({
        wallet: keypair,
        publicKey: keypair.publicKey.toString(),
        isLoading: false,
      });

      await get().refreshBalance();
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  importFromPrivateKey: async (secretKeyBase58: string) => {
    set({ isLoading: true, error: null });
    try {
      const trimmed = secretKeyBase58.trim();
      const bytes = bs58.decode(trimmed);
      if (bytes.length !== 64) {
        throw new Error("Invalid private key: must be 64 bytes (base58 decoded)");
      }
      const keypair = Keypair.fromSecretKey(new Uint8Array(bytes));
      await SecureStore.deleteItemAsync(STORE_KEY_MNEMONIC);
      await SecureStore.setItemAsync(STORE_KEY_SECRET, trimmed);

      set({
        wallet: keypair,
        publicKey: keypair.publicKey.toString(),
        isLoading: false,
      });

      await get().refreshBalance();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg, isLoading: false });
      throw e;
    }
  },

  loadWallet: async () => {
    set({ isLoading: true, error: null });
    try {
      const secretKey = await SecureStore.getItemAsync(STORE_KEY_SECRET);
      if (secretKey) {
        const bytes = bs58.decode(secretKey);
        const keypair = Keypair.fromSecretKey(new Uint8Array(bytes));
        set({
          wallet: keypair,
          publicKey: keypair.publicKey.toString(),
        });
        get().refreshBalance();
        return;
      }

      const mnemonic = await SecureStore.getItemAsync(STORE_KEY_MNEMONIC);
      if (mnemonic) {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const keypair = Keypair.fromSeed(new Uint8Array(seed.slice(0, 32)));
        set({
          wallet: keypair,
          publicKey: keypair.publicKey.toString(),
        });
        get().refreshBalance();
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  getPrivateKeyBase58: () => {
    const { wallet } = get();
    if (!wallet) return null;
    return bs58.encode(wallet.secretKey);
  },

  getMnemonic: async () => {
    return SecureStore.getItemAsync(STORE_KEY_MNEMONIC);
  },

  refreshBalance: async () => {
    const { publicKey } = get();
    if (!publicKey) {
      if (publicBalanceRefreshTimeoutId) {
        clearTimeout(publicBalanceRefreshTimeoutId);
        publicBalanceRefreshTimeoutId = null;
      }
      return;
    }

    try {
      const lamports = await getBalanceLamports(publicKey);
      set({ balance: lamports / LAMPORTS_PER_SOL });

      if (publicBalanceRefreshTimeoutId) clearTimeout(publicBalanceRefreshTimeoutId);
      publicBalanceRefreshTimeoutId = setTimeout(
        () => get().refreshBalance(),
        PUBLIC_BALANCE_REFRESH_INTERVAL_MS,
      );
    } catch (e: unknown) {
      console.error(
        "Failed to fetch balance:",
        e instanceof Error ? e.message : e,
      );
    }
  },

  requestAirdrop: async () => {
    const { publicKey } = get();
    if (!publicKey) return;

    try {
      set({ isLoading: true, error: null });
      await requestAirdropRpc(publicKey, LAMPORTS_PER_SOL);
      await get().refreshBalance();
      set({ isLoading: false });
    } catch (e: unknown) {
      console.error("Airdrop failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      const friendly = /JSON|parse|Unexpected/i.test(msg)
        ? "Airdrop unavailable. Try again later or use a devnet faucet."
        : msg;
      set({ error: friendly, isLoading: false });
    }
  },

  sendSol: async (toAddress: string, amountSol: number) => {
    const { wallet, balance } = get();
    if (!wallet) throw new Error("No wallet loaded");
    const resolvedAddress = resolveRecipientToAddress(toAddress);
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    if (lamports <= 0) throw new Error("Amount must be greater than 0");
    if (amountSol > balance) throw new Error("Insufficient balance");
    const toPubkey = new PublicKey(resolvedAddress);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey,
        lamports,
      }),
    );
    const { blockhash, lastValidBlockHeight } = await getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    tx.sign(wallet);
    const base64 = Buffer.from(tx.serialize()).toString("base64");
    const sig = await sendTransactionBase64(base64);
    await confirmTransactionRpc(sig, blockhash, lastValidBlockHeight);
    await get().refreshBalance();
    return sig;
  },

  deleteWallet: async () => {
    try {
      set({ isLoading: true });
      await SecureStore.deleteItemAsync(STORE_KEY_MNEMONIC);
      await SecureStore.deleteItemAsync(STORE_KEY_SECRET);
      if (publicBalanceRefreshTimeoutId) {
        clearTimeout(publicBalanceRefreshTimeoutId);
        publicBalanceRefreshTimeoutId = null;
      }
      set({ wallet: null, publicKey: null, balance: 0, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },
}));
