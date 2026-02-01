import Constants from "expo-constants";

const PUBLIC_DEVNET = "https://api.devnet.solana.com";

/**
 * Helius (or other ZK Compression–capable) RPC URL. Required for ZK: wallet and compression
 * both use this when set so getSlot, getCompressedBalanceByOwner, etc. work.
 * From .env EXPO_PUBLIC_COMPRESSION_API_URL; in release, from app.config.js extra (baked at build time).
 * Example: https://devnet.helius-rpc.com?api-key=YOUR_KEY
 */
const fromExtra =
  (Constants.expoConfig as { extra?: { compressionApiUrl?: string } })?.extra
    ?.compressionApiUrl;
const fromEnv = (process as any).env?.EXPO_PUBLIC_COMPRESSION_API_URL;
const heliusOrZkUrl =
  (typeof fromExtra === "string" && fromExtra.trim() ? fromExtra.trim() : undefined) ||
  (typeof fromEnv === "string" && fromEnv.trim() ? fromEnv.trim() : undefined);

/** Devnet RPC for wallet (balance, send, etc.). Uses Helius when set so ZK and wallet share one RPC. */
export const DEVNET_RPC_URL = heliusOrZkUrl ?? PUBLIC_DEVNET;

/** Same as DEVNET_RPC_URL when Helius set; used by createRpc for compression. */
export const DEVNET_COMPRESSION_API_URL: string | undefined = heliusOrZkUrl;

/** Fallback when Helius not set (compression will fail until EXPO_PUBLIC_COMPRESSION_API_URL is set). */
export const DEVNET_COMPRESSION_RPC_URL = PUBLIC_DEVNET;

/** True when Helius/compression URL is set; compression and wallet both use it. */
export const USE_COMPRESSION_INDEXER = Boolean(heliusOrZkUrl);

/** Solscan devnet transaction URL (e.g. https://solscan.io/tx/{sig}?cluster=devnet). */
export function getSolscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}
