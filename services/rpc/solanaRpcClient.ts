/**
 * Solana RPC and signed request handling via @solana/client (framework-kit).
 * Uses createSolanaRpcClient for getBalance, getLatestBlockhash, sendTransaction so RPC
 * goes through the official client and benefits from its transport in React Native.
 * @see https://github.com/solana-foundation/framework-kit/tree/main/packages/client
 */
// Must run before @solana/client; RN has no global Event and the client (or deps) expect it.
import "@/utils/polyfills";

import { createSolanaRpcClient } from "@solana/client";
import { address, airdropFactory, lamports } from "@solana/kit";

import { useSettingsStore } from "@/store/settingsStore";

const DEVNET_WS = "wss://api.devnet.solana.com";
const MAINNET_WS = "wss://api.mainnet-beta.solana.com";

type RpcClient = ReturnType<typeof createSolanaRpcClient>;
type AirdropFn = ReturnType<typeof airdropFactory>;

let cached: { url: string; client: RpcClient; airdrop: AirdropFn } | null = null;

function getOrCreateRpcClient(): { client: RpcClient; airdrop: AirdropFn } {
  const url = useSettingsStore.getState().getRpcUrl();
  const ws =
    url.includes("mainnet") ? MAINNET_WS : DEVNET_WS;
  if (cached && cached.url === url) {
    return { client: cached.client, airdrop: cached.airdrop };
  }
  const client = createSolanaRpcClient({
    endpoint: url as Parameters<
      typeof createSolanaRpcClient
    >[0]["endpoint"],
    websocketEndpoint: ws as Parameters<
      typeof createSolanaRpcClient
    >[0]["websocketEndpoint"],
    commitment: "confirmed",
  });
  const airdrop = airdropFactory({
    rpc: client.rpc as Parameters<typeof airdropFactory>[0]["rpc"],
    rpcSubscriptions: client.rpcSubscriptions as Parameters<
      typeof airdropFactory
    >[0]["rpcSubscriptions"],
  });
  cached = { url, client, airdrop };
  return { client, airdrop };
}

/** Get SOL balance in lamports for an address (base58 string). */
export async function getBalanceLamports(
  addressBase58: string,
): Promise<number> {
  const { client } = getOrCreateRpcClient();
  const resp = await client.rpc
    .getBalance(address(addressBase58), { commitment: "confirmed" })
    .send();
  // RPC returns result.value (lamports) or full result; some clients wrap in .result
  const raw =
    typeof resp === "object" && resp !== null && "result" in resp
      ? (resp as { result: { value?: bigint | number } | null }).result
      : resp;
  const value =
    typeof raw === "object" && raw !== null && "value" in raw
      ? (raw as { value: bigint | number }).value
      : typeof raw === "number" || typeof raw === "bigint"
        ? raw
        : NaN;
  const lamports = Number(value);
  if (!Number.isFinite(lamports) || lamports < 0) {
    throw new Error(`Invalid getBalance response: ${JSON.stringify(resp)}`);
  }
  return lamports;
}

/** Get latest blockhash and last valid block height for building/sending transactions. */
export async function getLatestBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const { client } = getOrCreateRpcClient();
  const resp = await client.rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();
  const value =
    typeof resp === "object" && resp && "value" in resp
      ? (resp as { value: { blockhash: string; lastValidBlockHeight: bigint } })
          .value
      : resp;
  if (!value || typeof value !== "object" || !("blockhash" in value)) {
    throw new Error("Invalid getLatestBlockhash response");
  }
  return {
    blockhash: value.blockhash as string,
    lastValidBlockHeight: Number(
      (value as { lastValidBlockHeight: bigint }).lastValidBlockHeight,
    ),
  };
}

/** Send a signed transaction (base64-encoded wire format). Returns signature. */
export async function sendTransactionBase64(
  signedBase64: string,
): Promise<string> {
  const { client } = getOrCreateRpcClient();
  const sig = await client.rpc
    .sendTransaction(
      signedBase64 as Parameters<typeof client.rpc.sendTransaction>[0],
      {
        encoding: "base64",
        skipPreflight: false,
        preflightCommitment: "confirmed",
      },
    )
    .send();
  return typeof sig === "string"
    ? sig
    : (sig as { toString: () => string }).toString();
}

/** Request airdrop (devnet/testnet only). Returns signature. */
export async function requestAirdropRpc(
  addressBase58: string,
  amountLamports: number,
): Promise<string> {
  const { airdrop } = getOrCreateRpcClient();
  const sig = await airdrop({
    commitment: "confirmed",
    recipientAddress: address(addressBase58),
    lamports: lamports(BigInt(amountLamports)),
  });
  return typeof sig === "string"
    ? sig
    : (sig as { toString: () => string }).toString();
}

/** Poll until transaction is confirmed or blockhash expires (simple confirm). */
export async function confirmTransactionRpc(
  signature: string,
  _blockhash: string,
  _lastValidBlockHeight: number,
): Promise<void> {
  const { client } = getOrCreateRpcClient();
  const maxWaitMs = 60_000;
  const pollMs = 500;
  const start = Date.now();
  const sigs = [signature] as unknown as Parameters<
    typeof client.rpc.getSignatureStatuses
  >[0];
  while (Date.now() - start < maxWaitMs) {
    const resp = await client.rpc
      .getSignatureStatuses(sigs, { searchTransactionHistory: true })
      .send();
    const raw =
      typeof resp === "object" && resp && "value" in resp
        ? (resp as { value: unknown }).value
        : resp;
    const value = Array.isArray(raw) ? raw : [];
    const status = value[0] as
      | { confirmationStatus?: string }
      | null
      | undefined;
    if (status && typeof status === "object" && status.confirmationStatus) {
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      )
        return;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error("Transaction confirmation timeout");
}

/** Current RPC client (for tools that need it). */
export function getRpcClient(): RpcClient {
  return getOrCreateRpcClient().client;
}
