import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";

const STORAGE_KEY = "@ghostwallet:settings";

export type ColorSchemeSetting = "light" | "dark" | "system";
export type NetworkKind = "devnet" | "mainnet";

interface SettingsState {
  /** UI theme: light, dark, or follow system. */
  colorScheme: ColorSchemeSetting;
  /** Network for RPC: devnet (testnet) or mainnet. */
  network: NetworkKind;
  /** Resolve RPC URL for current network. */
  getRpcUrl: () => string;
  setColorScheme: (value: ColorSchemeSetting) => Promise<void>;
  setNetwork: (value: NetworkKind) => Promise<void>;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  colorScheme: "system",
  network: "devnet",

  getRpcUrl: () => {
    const { network } = get();
    return network === "mainnet" ? MAINNET_RPC_URL : DEVNET_RPC_URL;
  },

  setColorScheme: async (value: ColorSchemeSetting) => {
    set({ colorScheme: value });
    const { colorScheme, network } = get();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ colorScheme, network }),
    );
  },

  setNetwork: async (value: NetworkKind) => {
    set({ network: value });
    const { colorScheme, network } = get();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ colorScheme, network }),
    );
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<{
        colorScheme: ColorSchemeSetting;
        network: NetworkKind;
      }>;
      set({
        colorScheme:
          data.colorScheme === "light" ||
          data.colorScheme === "dark" ||
          data.colorScheme === "system"
            ? data.colorScheme
            : "system",
        network:
          data.network === "devnet" || data.network === "mainnet"
            ? data.network
            : "devnet",
      });
    } catch {
      // ignore
    }
  },
}));
