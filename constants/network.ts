/**
 * Network config: Devnet.
 * Single place to switch RPC for wallet and compression (stateless.js).
 */
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";

/**
 * Devnet RPC for ZK Compression (stateless.js / compressed-token).
 */
export const DEVNET_COMPRESSION_RPC_URL = "https://api.devnet.solana.com";

/**
 * Optional ZK Compression–capable RPC URL (e.g. Helius). Used per Light Protocol:
 * when set, createRpc(endpoint, compressionApiEndpoint, proverEndpoint) is called
 * with this URL for all three so RPC, Photon (compression), and Prover use one endpoint.
 * If unset: we use public devnet for RPC only; compression methods (balance, transfer) fail until set.
 * If set: balance, compress, and private send work; that provider can see (address, balance).
 * Example: https://devnet.helius-rpc.com?api-key=YOUR_KEY — see zkcompression.com/get-started/intro-to-development
 */
export const DEVNET_COMPRESSION_API_URL: string | undefined =
  typeof process !== "undefined" &&
  (process as any).env?.EXPO_PUBLIC_COMPRESSION_API_URL;

/** True only when user has configured an indexer; otherwise we don't query balance from any server. */
export const USE_COMPRESSION_INDEXER = Boolean(DEVNET_COMPRESSION_API_URL);

/** Solscan devnet transaction URL (e.g. https://solscan.io/tx/{sig}?cluster=devnet). */
export function getSolscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}
