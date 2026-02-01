import { Keypair } from "@solana/web3.js";
import { create } from "zustand";

const SHIELDED_UNAVAILABLE_MSG =
  "Shielded SOL (Light Protocol zk.js) has been removed from this app. Use the ZK Compression tab for compressed tokens, or open the Light Shield link in your browser.";

interface ShieldedState {
  isInitialized: boolean;
  isLoading: boolean;
  privateBalance: number;
  error: string | null;
  lightUser: null;
  lightProvider: null;

  initialize: (wallet: Keypair) => Promise<void>;
  shield: (amount: number) => Promise<string>;
  privateTransfer: (amount: number, recipient: string) => Promise<string>;
  unshield: (amount: number) => Promise<string>;
  refreshBalance: () => Promise<void>;
  getShieldedAddress: () => string | null;
  clearError: () => void;
  /** Sync private (shielded) balance from ZK Compression. Used so balance data reads from this store. */
  setPrivateBalanceFromCompressed: (balance: number, error: string | null) => void;
}

export const useShieldedStore = create<ShieldedState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  privateBalance: 0,
  error: SHIELDED_UNAVAILABLE_MSG,
  lightUser: null,
  lightProvider: null,

  initialize: async () => {
    set({ isLoading: false, error: SHIELDED_UNAVAILABLE_MSG });
  },

  clearError: () => set({ error: null }),

  shield: async () => {
    throw new Error(SHIELDED_UNAVAILABLE_MSG);
  },

  privateTransfer: async () => {
    throw new Error(SHIELDED_UNAVAILABLE_MSG);
  },

  unshield: async () => {
    throw new Error(SHIELDED_UNAVAILABLE_MSG);
  },

  refreshBalance: async () => {},

  getShieldedAddress: () => null,

  setPrivateBalanceFromCompressed: (balance, error) => {
    set({ privateBalance: balance, error });
  },
}));
