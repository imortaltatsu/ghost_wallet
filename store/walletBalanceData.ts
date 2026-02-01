/**
 * Single source for wallet balance data — same values the Wallet page shows
 * (Total = Public + Shielded). Shielded (private) balance is read from shieldedStore,
 * kept in sync with compressedStore (ZK Compression).
 */

import { useCompressedStore } from "@/store/compressedStore";
import { useShieldedStore } from "@/store/shieldedStore";
import { useWalletStore } from "@/store/walletStore";
import { PublicKey } from "@solana/web3.js";

export interface WalletBalanceData {
  totalSol: number;
  publicSol: number;
  privateSol: number;
  privateError: string | null;
}

/**
 * Get wallet balance data (same as Wallet route: Total = Public + Shielded).
 * Shielded = compressed SOL balance. If refresh is true, updates the stores first.
 */
export async function getWalletBalanceData(options?: {
  refresh?: boolean;
}): Promise<WalletBalanceData> {
  const publicKey = useWalletStore.getState().publicKey;
  if (!publicKey) {
    return { totalSol: 0, publicSol: 0, privateSol: 0, privateError: "No wallet loaded" };
  }

  if (options?.refresh) {
    const owner = new PublicKey(publicKey);
    await Promise.all([
      useWalletStore.getState().refreshBalance(),
      useCompressedStore.getState().refresh(owner),
    ]);
  }

  // Private (shielded) balance: sync from compressedStore then read from shieldedStore.
  const compressed = useCompressedStore.getState();
  useShieldedStore.getState().setPrivateBalanceFromCompressed(
    compressed.compressedSolBalance ?? 0,
    compressed.error ?? null,
  );
  const publicSol = useWalletStore.getState().balance ?? 0;
  const shielded = useShieldedStore.getState();
  const privateSol = shielded.privateBalance ?? 0;
  const privateError = shielded.error ?? null;
  const totalSol = publicSol + privateSol;

  return { totalSol, publicSol, privateSol, privateError };
}
