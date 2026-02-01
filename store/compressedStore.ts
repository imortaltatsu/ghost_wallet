import { getErrorMessage } from "@/utils/error";
import "@/utils/polyfills";
import type { Keypair } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { create } from "zustand";

import {
  DEVNET_COMPRESSION_API_URL,
  DEVNET_COMPRESSION_RPC_URL,
} from "@/constants/network";

const COMPRESSION_RPC_URL = DEVNET_COMPRESSION_RPC_URL;
const COMPRESSION_API_URL = DEVNET_COMPRESSION_API_URL;

/** Interval for background refresh of private SOL balance (cache is current state; this keeps it updated). */
const PRIVATE_BALANCE_REFRESH_INTERVAL_MS = 30_000;

/** One compression tx signature for display. */
export interface CompressionSignature {
  signature: string;
  slot: number;
  blockTime: number;
}

/** ParsedTokenAccount-like (for programmatic transfer: getCompressedTokenAccountsByOwner + selectMin + transfer). */
type ParsedTokenAccountLike = {
  compressedAccount: { hash: unknown };
  parsed?: { amount: unknown };
};

/** Light stateless.js Rpc type (createRpc + getCompressedTokenBalancesByOwnerV2, getCompressedBalanceByOwner, getAccountInfo, getCompressionSignaturesForTokenOwner, getCompressedTokenAccountsByOwner, getValidityProof, getLatestBlockhash) */
type Rpc = {
  getCompressedBalanceByOwner: (
    owner: PublicKey,
  ) => Promise<{ toNumber?: () => number }>;
  getCompressedTokenBalancesByOwnerV2: (
    owner: PublicKey,
    options?: { limit?: number; cursor?: string; mint?: PublicKey },
  ) => Promise<{
    value: {
      items: Array<{
        balance: { toNumber?: () => number } | string | number;
        mint: PublicKey;
      }>;
      cursor?: string;
    };
  }>;
  getAccountInfo?: (pubkey: PublicKey) => Promise<{ data: Uint8Array } | null>;
  getCompressionSignaturesForTokenOwner?: (
    owner: PublicKey,
    options?: { limit?: number; cursor?: string },
  ) => Promise<{
    items: Array<{ signature: string; slot: number; blockTime: number }>;
    cursor?: string | null;
  }>;
  getCompressedTokenAccountsByOwner?: (
    owner: PublicKey,
    options?: { mint?: PublicKey },
  ) => Promise<{ items: ParsedTokenAccountLike[] }>;
  getValidityProof?: (
    hashes: unknown[],
    newAddresses?: unknown[],
  ) => Promise<{ rootIndices: number[]; compressedProof: unknown }>;
  getLatestBlockhash?: () => Promise<
    | { blockhash: string; lastValidBlockHeight?: number }
    | { value?: { blockhash: string; lastValidBlockHeight?: number } }
  >;
  getStateTreeInfos?: () => Promise<unknown[]>;
};

/**
 * Create Light Protocol Rpc per zkcompression.com: when a compression endpoint
 * (e.g. Helius) is set, use it for RPC, Photon (compression), and Prover so
 * getCompressedBalanceByOwner, getCompressedAccountsByOwner, compress, and transfer
 * all go through the same ZK Compression–capable endpoint.
 */
function loadStateless(): Rpc | null {
  try {
    const mod = require("@lightprotocol/stateless.js") as {
      createRpc: (
        endpoint?: string,
        compressionApiEndpoint?: string,
        proverEndpoint?: string,
        config?: { commitment?: string },
      ) => Rpc;
    };
    if (!mod?.createRpc) return null;
    const commitment = { commitment: "confirmed" as const };
    const rpc = COMPRESSION_API_URL
      ? mod.createRpc(
          COMPRESSION_API_URL,
          COMPRESSION_API_URL,
          COMPRESSION_API_URL,
          commitment,
        )
      : mod.createRpc(COMPRESSION_RPC_URL, undefined, undefined, commitment);
    if (
      !rpc?.getCompressedBalanceByOwner ||
      !rpc?.getCompressedTokenBalancesByOwnerV2
    )
      return null;
    return rpc;
  } catch {
    return null;
  }
}

export interface CompressedTokenBalance {
  mint: string;
  /** Raw balance (smallest unit). Use with decimals for display. */
  balance: number;
  /** Mint decimals (SPL mint account byte 44). Used to format balance for display. */
  decimals?: number;
}

interface CompressedState {
  rpc: Rpc | null;
  error: string | null;
  compressedSolBalance: number;
  compressedTokenBalances: CompressedTokenBalance[];
  compressionSignatures: CompressionSignature[];
  isRefreshing: boolean;
  isFetchingSignatures: boolean;
  transferError: string | null;
  /** Timestamp (ms) of last successful balance refresh; used as cache indicator. */
  lastRefreshedAt: number | null;

  /** Refresh private SOL and token balances. With owner=null clears cache and stops periodic refresh. Options.silent=true keeps cached values visible (no isRefreshing). */
  refresh: (owner: PublicKey | null, options?: { silent?: boolean }) => Promise<void>;
  fetchCompressionSignatures: (owner: PublicKey) => Promise<void>;
  transferCompressedToken: (
    payer: Keypair,
    owner: Keypair,
    recipient: PublicKey,
    mint: PublicKey,
    amount: number,
  ) => Promise<string>;
  /** Private SOL transfer (compressed SOL via ZK Compression). Throws if RPC/SDK unavailable. */
  transferCompressedSol: (
    payer: Keypair,
    owner: Keypair,
    recipient: PublicKey,
    amountSol: number,
  ) => Promise<string>;
  /** Convert public SOL to private (compressed) SOL. Increases private SOL balance. */
  compressSol: (
    payer: Keypair,
    owner: Keypair,
    amountSol: number,
  ) => Promise<string>;
  /** Decompress compressed SOL to native SOL: recipient receives lamports in their native account. SDK: decompress(rpc, payer, lamports, toPublicKey). */
  decompressSol: (
    payer: Keypair,
    amountSol: number,
    recipient: PublicKey,
  ) => Promise<string>;
  /** Decompress compressed tokens to SPL (uncompressed) ATA. Uses getCompressedTokenAccountsByOwner, selectMin, getValidityProof, getTokenPoolInfos, selectTokenPoolInfosForDecompression, CompressedTokenProgram.decompress. */
  decompressToken: (
    payer: Keypair,
    owner: Keypair,
    mint: PublicKey,
    amount: number,
  ) => Promise<string>;
  /** Compress SPL tokens to compressed (ZK) tokens. Uses getOrCreateAssociatedTokenAccount, getStateTreeInfos, getTokenPoolInfos, CompressedTokenProgram.compress. */
  compressToken: (
    payer: Keypair,
    owner: Keypair,
    mint: PublicKey,
    amount: number,
  ) => Promise<string>;
  /** Create a token pool for an existing SPL mint so it can be compressed. Requires only fee_payer; no mint authority. See https://www.zkcompression.com/compressed-tokens/guides/add-token-pools-to-mint-accounts */
  createTokenPool: (payer: Keypair, mint: PublicKey) => Promise<string>;
  /** Receive payments (Light-token): get or create Light ATA for recipient. Share returned address with sender. Docs: https://www.zkcompression.com/light-token/toolkits/for-wallets#receive-payments */
  getOrCreateReceiveAta: (
    payer: Keypair,
    recipient: PublicKey,
    mint: PublicKey,
  ) => Promise<{ address: PublicKey; amount?: number }>;
  clearError: () => void;
  clearTransferError: () => void;
}

export const useCompressedStore = create<CompressedState>((set, get) => {
  let periodicRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    rpc: null,
    error: null,
    compressedSolBalance: 0,
    compressedTokenBalances: [],
    compressionSignatures: [],
    isRefreshing: false,
    isFetchingSignatures: false,
    transferError: null,
    lastRefreshedAt: null,

    transferCompressedToken: async (
    payer: Keypair,
    owner: Keypair,
    recipient: PublicKey,
    mint: PublicKey,
    amount: number,
  ) => {
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    try {
      const ctoken = require("@lightprotocol/compressed-token") as {
        getAssociatedTokenAddressInterface?: (
          mint: PublicKey,
          owner: PublicKey,
        ) => PublicKey;
        getOrCreateAtaInterface?: (
          rpc: unknown,
          payer: Keypair,
          mint: PublicKey,
          owner: PublicKey,
          allowOwnerOffCurve?: boolean,
        ) => Promise<unknown>;
        transferInterface?: (
          rpc: unknown,
          payer: Keypair,
          source: PublicKey,
          mint: PublicKey,
          destination: PublicKey,
          owner: Keypair,
          amount: number,
          programId?: PublicKey,
        ) => Promise<string>;
        selectMinCompressedTokenAccountsForTransfer?: (
          accounts: ParsedTokenAccountLike[],
          transferAmount: { toNumber?: () => number },
          maxInputs?: number,
        ) => [ParsedTokenAccountLike[], unknown, unknown, unknown];
        CompressedTokenProgram?: {
          transfer: (params: {
            payer: PublicKey;
            inputCompressedTokenAccounts: ParsedTokenAccountLike[];
            toAddress: PublicKey;
            amount: number;
            recentValidityProof: unknown;
            recentInputStateRootIndices: number[];
          }) => Promise<unknown>;
        };
      };
      const stateless = require("@lightprotocol/stateless.js") as {
        buildAndSignTx?: (
          instructions: unknown[],
          payer: Keypair,
          blockhash: string,
          additionalSigners?: Keypair[],
        ) => unknown;
        sendAndConfirmTx?: (
          rpc: unknown,
          tx: unknown,
          confirmOptions?: { commitment?: string },
          blockHashCtx?: { blockhash: string; lastValidBlockHeight: number },
        ) => Promise<string>;
        dedupeSigner?: (...signers: (Keypair | PublicKey)[]) => Keypair[];
        bn?: new (value: number) => { toNumber?: () => number };
      };
      const { ComputeBudgetProgram } = require("@solana/web3.js") as {
        ComputeBudgetProgram: {
          setComputeUnitLimit: (opts: { units: number }) => unknown;
        };
      };

      const getAccounts = rpc.getCompressedTokenAccountsByOwner;
      const getProof = rpc.getValidityProof;
      const getBlockhash = rpc.getLatestBlockhash;
      const selectMin = ctoken?.selectMinCompressedTokenAccountsForTransfer;
      const programTransfer = ctoken?.CompressedTokenProgram?.transfer;
      const buildAndSign = stateless?.buildAndSignTx;
      const sendAndConfirm = stateless?.sendAndConfirmTx;
      const dedupeSigner = stateless?.dedupeSigner;

      // Compressed Token Transfer (private) — 1:1 with getCompressedTokenAccountsByOwner → selectMin → getValidityProof → CompressedTokenProgram.transfer → buildAndSignTx → sendAndConfirmTx
      if (
        getAccounts &&
        getProof &&
        getBlockhash &&
        selectMin &&
        programTransfer &&
        buildAndSign &&
        sendAndConfirm &&
        dedupeSigner
      ) {
        // Step 2: Fetch compressed token accounts for owner + mint
        const accountsRes = await getAccounts.call(rpc, owner.publicKey, {
          mint,
        });
        const items = accountsRes?.items ?? [];
        if (items.length === 0) {
          throw new Error("No compressed token accounts found for this mint.");
        }
        // Step 3: Select minimum compressed accounts for transfer amount; get validity proof
        const BN = stateless.bn ?? require("bn.js");
        const amountBN =
          typeof BN === "function"
            ? new (BN as new (n: number) => { toNumber?: () => number })(amount)
            : { toNumber: () => amount };
        const [inputAccounts] = selectMin(items, amountBN);
        const hashes = inputAccounts.map((a) => a.compressedAccount.hash);
        const proof = await getProof.call(rpc, hashes);
        // Step 4: Create transfer instruction; build, sign, submit
        const ix = await programTransfer({
          payer: payer.publicKey,
          inputCompressedTokenAccounts: inputAccounts,
          toAddress: recipient,
          amount,
          recentValidityProof: proof.compressedProof,
          recentInputStateRootIndices: proof.rootIndices,
        });
        const blockhashRes = await getBlockhash!.call(rpc);
        const blockhash =
          typeof blockhashRes === "object" &&
          blockhashRes !== null &&
          "value" in blockhashRes &&
          blockhashRes.value?.blockhash
            ? (blockhashRes as { value: { blockhash: string } }).value.blockhash
            : (blockhashRes as { blockhash: string }).blockhash;
        const lastValidBlockHeight =
          typeof blockhashRes === "object" &&
          blockhashRes !== null &&
          "value" in blockhashRes &&
          blockhashRes.value?.lastValidBlockHeight != null
            ? (blockhashRes as { value: { lastValidBlockHeight: number } })
                .value.lastValidBlockHeight
            : ((blockhashRes as { lastValidBlockHeight?: number })
                .lastValidBlockHeight ?? 0);
        const additionalSigners = dedupeSigner(payer, owner);
        const signedTx = buildAndSign(
          [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), ix],
          payer,
          blockhash,
          additionalSigners,
        );
        const sig = await sendAndConfirm(
          rpc,
          signedTx,
          { commitment: "confirmed" },
          { blockhash, lastValidBlockHeight },
        );
        return typeof sig === "string" ? sig : String(sig);
      }

      if (
        ctoken?.getAssociatedTokenAddressInterface &&
        ctoken?.getOrCreateAtaInterface &&
        ctoken?.transferInterface
      ) {
        const sourceAta = ctoken.getAssociatedTokenAddressInterface(
          mint,
          owner.publicKey,
        );
        await ctoken.getOrCreateAtaInterface(
          rpc,
          payer,
          mint,
          recipient,
          false,
        );
        const destAta = ctoken.getAssociatedTokenAddressInterface(
          mint,
          recipient,
        );
        const sig = await ctoken.transferInterface(
          rpc,
          payer,
          sourceAta,
          mint,
          destAta,
          owner,
          amount,
        );
        return sig;
      }

      set({ transferError: "Compressed-token SDK unavailable." });
      throw new Error("Compressed-token SDK unavailable.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ transferError: msg });
      throw e;
    }
  },

  refresh: async (owner: PublicKey | null, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!owner) {
      if (periodicRefreshTimeoutId) {
        clearTimeout(periodicRefreshTimeoutId);
        periodicRefreshTimeoutId = null;
      }
      set({
        compressedSolBalance: 0,
        compressedTokenBalances: [],
        lastRefreshedAt: null,
      });
      return;
    }
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({
        rpc,
        error: rpc ? null : "Compression RPC unavailable in this environment.",
      });
    }
    if (!rpc) return;

    if (!silent) set({ isRefreshing: true, error: null });
    try {
      const [solRes, tokenRes] = await Promise.allSettled([
        rpc.getCompressedBalanceByOwner(owner),
        rpc.getCompressedTokenBalancesByOwnerV2(owner, { limit: 50 }),
      ]);

      const compressedSolBalance =
        solRes.status === "fulfilled" && solRes.value?.toNumber
          ? solRes.value.toNumber() / 1e9
          : solRes.status === "fulfilled" && typeof solRes.value === "number"
            ? solRes.value / 1e9
            : 0;

      const rawItems =
        tokenRes.status === "fulfilled" && tokenRes.value?.value?.items
          ? tokenRes.value.value.items
          : [];
      const compressedTokenBalances: CompressedTokenBalance[] = [];
      for (const item of rawItems) {
        const balanceRaw =
          typeof item.balance === "string"
            ? parseInt(item.balance, 16)
            : typeof item.balance === "object" && item.balance?.toNumber
              ? item.balance.toNumber()
              : Number(item.balance ?? 0);
        let decimals: number | undefined;
        if (rpc.getAccountInfo) {
          try {
            const mintInfo = await rpc.getAccountInfo(item.mint);
            if (mintInfo?.data && mintInfo.data.length > 44) {
              decimals = mintInfo.data[44];
            }
          } catch {
            // ignore; display raw balance
          }
        }
        compressedTokenBalances.push({
          mint: item.mint.toBase58(),
          balance: balanceRaw,
          decimals,
        });
      }

      set({
        compressedSolBalance,
        compressedTokenBalances,
        isRefreshing: false,
        lastRefreshedAt: Date.now(),
      });

      if (periodicRefreshTimeoutId) clearTimeout(periodicRefreshTimeoutId);
      periodicRefreshTimeoutId = setTimeout(
        () => get().refresh(owner, { silent: true }),
        PRIVATE_BALANCE_REFRESH_INTERVAL_MS,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg, isRefreshing: false });
    }
  },

  /** Get transaction history: getCompressionSignaturesForTokenOwner(owner). Docs: https://www.zkcompression.com/compressed-tokens/advanced-guides/add-wallet-support-for-compressed-tokens#get-transaction-history-2 */
  fetchCompressionSignatures: async (owner: PublicKey) => {
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc?.getCompressionSignaturesForTokenOwner) {
      set({ compressionSignatures: [] });
      return;
    }
    set({ isFetchingSignatures: true });
    try {
      const res = await rpc.getCompressionSignaturesForTokenOwner(owner, {
        limit: 20,
      });
      const items = res?.items ?? [];
      set({
        compressionSignatures: items.map((sig) => ({
          signature: sig.signature,
          slot: sig.slot,
          blockTime: sig.blockTime,
        })),
        isFetchingSignatures: false,
      });
    } catch {
      set({ compressionSignatures: [], isFetchingSignatures: false });
    }
  },

  transferCompressedSol: async (
    payer: Keypair,
    owner: Keypair,
    recipient: PublicKey,
    amountSol: number,
  ) => {
    // Private SOL transfer needs getCompressedAccountsByOwner; only compression indexers (e.g. Helius) provide it.
    if (!COMPRESSION_API_URL) {
      const msg =
        "To send private SOL, set a compression indexer. Add EXPO_PUBLIC_COMPRESSION_API_URL to your .env with a ZK Compression API URL (e.g. Helius devnet). See https://www.helius.dev/docs/api-reference/zk-compression";
      set({ transferError: msg });
      throw new Error(msg);
    }
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    const LAMPORTS_PER_SOL = 1e9;
    const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    if (amountLamports <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    try {
      const stateless = require("@lightprotocol/stateless.js") as {
        transfer?: (
          rpc: unknown,
          payer: Keypair,
          lamports: number,
          owner: Keypair,
          toAddress: PublicKey,
          confirmOptions?: { commitment?: string; skipPreflight?: boolean },
        ) => Promise<string>;
      };
      if (typeof stateless?.transfer !== "function") {
        throw new Error(
          "transfer() not found on @lightprotocol/stateless.js. Ensure the SDK exports the transfer action for compressed SOL.",
        );
      }
      const sig = await stateless.transfer(
        rpc,
        payer,
        amountLamports,
        owner,
        recipient,
        { commitment: "confirmed", skipPreflight: false },
      );
      await get().refresh(owner.publicKey);
      return sig;
    } catch (e) {
      const raw = getErrorMessage(e);
      const isMethodNotFound =
        /method not found|failed to get info for compressed accounts/i.test(
          raw,
        );
      const msg = isMethodNotFound
        ? "Compression indexer required. Set EXPO_PUBLIC_COMPRESSION_API_URL in .env to a ZK Compression API URL (e.g. Helius). See https://www.helius.dev/docs/api-reference/zk-compression"
        : raw;
      set({ transferError: msg });
      throw new Error(msg);
    }
  },

  compressSol: async (payer: Keypair, owner: Keypair, amountSol: number) => {
    const LAMPORTS_PER_SOL = 1e9;
    const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    if (amountLamports <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    try {
      const stateless = require("@lightprotocol/stateless.js") as {
        createRpc: (
          endpoint?: string,
          compressionApiEndpoint?: string,
          proverEndpoint?: string,
          config?: { commitment?: string },
        ) => unknown;
        compress?: (
          rpc: unknown,
          payer: Keypair,
          lamports: number,
          toAddress: PublicKey,
          outputStateTreeInfo?: unknown,
          confirmOptions?: unknown,
        ) => Promise<string>;
      };
      if (!stateless?.compress) {
        throw new Error(
          "compress() not found on @lightprotocol/stateless.js. Ensure the SDK exports the compress action.",
        );
      }
      const sig = await stateless.compress(
        rpc,
        payer,
        amountLamports,
        owner.publicKey,
        undefined,
        undefined,
      );
      await get().refresh(owner.publicKey);
      return sig;
    } catch (e) {
      set({ transferError: getErrorMessage(e) });
      throw e;
    }
  },

  decompressSol: async (
    payer: Keypair,
    amountSol: number,
    recipient: PublicKey,
  ) => {
    const LAMPORTS_PER_SOL = 1e9;
    const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    if (amountLamports <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    try {
      const stateless = require("@lightprotocol/stateless.js") as {
        decompress?: (
          rpc: unknown,
          payer: Keypair,
          lamports: number,
          toAddress: PublicKey,
          confirmOptions?: { commitment?: string },
        ) => Promise<string>;
      };
      if (!stateless?.decompress) {
        throw new Error(
          "decompress() not found on @lightprotocol/stateless.js. Use it to decompress to native SOL so the recipient receives lamports.",
        );
      }
      const sig = await stateless.decompress(
        rpc,
        payer,
        amountLamports,
        recipient,
        { commitment: "confirmed" },
      );
      await get().refresh(payer.publicKey);
      return typeof sig === "string" ? sig : String(sig);
    } catch (e) {
      set({ transferError: getErrorMessage(e) });
      throw e;
    }
  },

  decompressToken: async (
    payer: Keypair,
    owner: Keypair,
    mint: PublicKey,
    amount: number,
  ) => {
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    try {
      const getAccounts = rpc.getCompressedTokenAccountsByOwner;
      const getProof = rpc.getValidityProof;
      const getBlockhash = rpc.getLatestBlockhash;
      if (!getAccounts || !getProof || !getBlockhash) {
        throw new Error(
          "Decompress requires getCompressedTokenAccountsByOwner, getValidityProof, getLatestBlockhash.",
        );
      }
      const ctoken = require("@lightprotocol/compressed-token") as {
        selectMinCompressedTokenAccountsForTransfer?: (
          accounts: ParsedTokenAccountLike[],
          transferAmount: { toNumber?: () => number },
          maxInputs?: number,
        ) => [ParsedTokenAccountLike[], unknown, unknown, unknown];
        getTokenPoolInfos?: (
          rpc: unknown,
          mint: PublicKey,
        ) => Promise<Array<{ mint: PublicKey }>>;
        selectTokenPoolInfosForDecompression?: (
          infos: Array<{ mint: PublicKey }>,
          amount: number,
        ) => Array<{ mint: PublicKey }>;
        CompressedTokenProgram?: {
          decompress: (params: {
            payer: PublicKey;
            inputCompressedTokenAccounts: ParsedTokenAccountLike[];
            toAddress: PublicKey;
            amount: number;
            tokenPoolInfos: Array<unknown>;
            recentValidityProof: unknown;
            recentInputStateRootIndices: number[];
          }) => Promise<unknown>;
        };
      };
      const stateless = require("@lightprotocol/stateless.js") as {
        buildAndSignTx?: (
          instructions: unknown[],
          payer: Keypair,
          blockhash: string,
          additionalSigners?: Keypair[],
        ) => unknown;
        sendAndConfirmTx?: (
          rpc: unknown,
          tx: unknown,
          confirmOptions?: { commitment?: string },
          blockHashCtx?: { blockhash: string; lastValidBlockHeight: number },
        ) => Promise<string>;
        dedupeSigner?: (...signers: (Keypair | PublicKey)[]) => Keypair[];
        bn?: new (value: number) => { toNumber?: () => number };
      };
      const { ComputeBudgetProgram } = require("@solana/web3.js") as {
        ComputeBudgetProgram: {
          setComputeUnitLimit: (opts: { units: number }) => unknown;
        };
      };

      const selectMin = ctoken?.selectMinCompressedTokenAccountsForTransfer;
      const getTokenPoolInfos = ctoken?.getTokenPoolInfos;
      const selectTokenPoolInfosForDecompression =
        ctoken?.selectTokenPoolInfosForDecompression;
      const programDecompress = ctoken?.CompressedTokenProgram?.decompress;
      const buildAndSign = stateless?.buildAndSignTx;
      const sendAndConfirm = stateless?.sendAndConfirmTx;
      const dedupeSigner = stateless?.dedupeSigner;

      if (
        !selectMin ||
        !getTokenPoolInfos ||
        !selectTokenPoolInfosForDecompression ||
        !programDecompress ||
        !buildAndSign ||
        !sendAndConfirm ||
        !dedupeSigner
      ) {
        throw new Error(
          "Decompress requires compressed-token and stateless.js exports (selectMinCompressedTokenAccountsForTransfer, getTokenPoolInfos, selectTokenPoolInfosForDecompression, CompressedTokenProgram.decompress, buildAndSignTx, sendAndConfirmTx, dedupeSigner).",
        );
      }

      const accountsRes = await getAccounts.call(rpc, owner.publicKey, {
        mint,
      });
      const items = accountsRes?.items ?? [];
      if (items.length === 0) {
        throw new Error("No compressed token accounts found for this mint.");
      }
      const BN = stateless.bn ?? require("bn.js");
      const amountBN =
        typeof BN === "function"
          ? new (BN as new (n: number) => { toNumber?: () => number })(amount)
          : { toNumber: () => amount };
      const [inputAccounts] = selectMin(items, amountBN);
      const hashes = inputAccounts.map((a) => a.compressedAccount.hash);
      const proof = await getProof.call(rpc, hashes);
      const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
      const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
        tokenPoolInfos,
        amount,
      );
      if (selectedTokenPoolInfos.length === 0) {
        throw new Error("No token pool infos available for decompression.");
      }
      const ix = await programDecompress({
        payer: payer.publicKey,
        inputCompressedTokenAccounts: inputAccounts,
        toAddress: owner.publicKey,
        amount,
        tokenPoolInfos: selectedTokenPoolInfos,
        recentInputStateRootIndices: proof.rootIndices,
        recentValidityProof: proof.compressedProof,
      });
      const blockhashRes = await getBlockhash.call(rpc);
      const blockhash =
        typeof blockhashRes === "object" &&
        blockhashRes !== null &&
        "value" in blockhashRes &&
        blockhashRes.value?.blockhash
          ? (blockhashRes as { value: { blockhash: string } }).value.blockhash
          : (blockhashRes as { blockhash: string }).blockhash;
      const lastValidBlockHeight =
        typeof blockhashRes === "object" &&
        blockhashRes !== null &&
        "value" in blockhashRes &&
        blockhashRes.value?.lastValidBlockHeight != null
          ? (blockhashRes as { value: { lastValidBlockHeight: number } }).value
              .lastValidBlockHeight
          : ((blockhashRes as { lastValidBlockHeight?: number })
              .lastValidBlockHeight ?? 0);
      const additionalSigners = dedupeSigner(payer, owner);
      const signedTx = buildAndSign(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), ix],
        payer,
        blockhash,
        additionalSigners,
      );
      const sig = await sendAndConfirm(
        rpc,
        signedTx,
        { commitment: "confirmed" },
        { blockhash, lastValidBlockHeight },
      );
      await get().refresh(owner.publicKey);
      return typeof sig === "string" ? sig : String(sig);
    } catch (e) {
      const msg = getErrorMessage(e);
      set({ transferError: msg });
      throw e;
    }
  },

  compressToken: async (
    payer: Keypair,
    owner: Keypair,
    mint: PublicKey,
    amount: number,
  ) => {
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    try {
      const getStateTreeInfos = rpc.getStateTreeInfos;
      const getBlockhash = rpc.getLatestBlockhash;
      if (!getStateTreeInfos || !getBlockhash) {
        throw new Error(
          "Compress token requires getStateTreeInfos and getLatestBlockhash.",
        );
      }
      const stateless = require("@lightprotocol/stateless.js") as {
        buildAndSignTx?: (
          instructions: unknown[],
          payer: Keypair,
          blockhash: string,
          additionalSigners?: Keypair[],
        ) => unknown;
        sendAndConfirmTx?: (
          rpc: unknown,
          tx: unknown,
          confirmOptions?: { commitment?: string },
          blockHashCtx?: { blockhash: string; lastValidBlockHeight: number },
        ) => Promise<string>;
        selectStateTreeInfo?: (treeInfos: unknown[]) => unknown;
        dedupeSigner?: (...signers: (Keypair | PublicKey)[]) => Keypair[];
      };
      const ctoken = require("@lightprotocol/compressed-token") as {
        getTokenPoolInfos?: (
          rpc: unknown,
          mint: PublicKey,
        ) => Promise<unknown[]>;
        selectTokenPoolInfo?: (infos: unknown[]) => unknown;
        CompressedTokenProgram?: {
          compress: (params: {
            payer: PublicKey;
            owner: PublicKey;
            source: PublicKey;
            toAddress: PublicKey;
            amount: number;
            mint: PublicKey;
            outputStateTreeInfo: unknown;
            tokenPoolInfo: unknown;
          }) => Promise<unknown>;
        };
      };
      const { ComputeBudgetProgram } = require("@solana/web3.js") as {
        ComputeBudgetProgram: {
          setComputeUnitLimit: (opts: { units: number }) => unknown;
        };
      };

      const selectStateTreeInfo = stateless?.selectStateTreeInfo;
      const getTokenPoolInfos = ctoken?.getTokenPoolInfos;
      const selectTokenPoolInfo = ctoken?.selectTokenPoolInfo;
      const programCompress = ctoken?.CompressedTokenProgram?.compress;
      const buildAndSign = stateless?.buildAndSignTx;
      const sendAndConfirm = stateless?.sendAndConfirmTx;
      const dedupeSigner = stateless?.dedupeSigner;

      if (
        !selectStateTreeInfo ||
        !getTokenPoolInfos ||
        !selectTokenPoolInfo ||
        !programCompress ||
        !buildAndSign ||
        !sendAndConfirm
      ) {
        throw new Error(
          "Compress token requires stateless.js (selectStateTreeInfo, buildAndSignTx, sendAndConfirmTx) and compressed-token (getTokenPoolInfos, selectTokenPoolInfo, CompressedTokenProgram.compress).",
        );
      }

      let sourceTokenAccount: { address: PublicKey };
      try {
        const splToken = require("@solana/spl-token") as {
          getOrCreateAssociatedTokenAccount: (
            connection: unknown,
            payer: Keypair,
            mint: PublicKey,
            owner: PublicKey,
          ) => Promise<{ address: PublicKey }>;
        };
        if (typeof splToken?.getOrCreateAssociatedTokenAccount !== "function") {
          throw new Error(
            "getOrCreateAssociatedTokenAccount not found. Install @solana/spl-token.",
          );
        }
        sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
          rpc,
          payer,
          mint,
          owner.publicKey,
        );
      } catch (e) {
        const msg = getErrorMessage(e);
        set({ transferError: msg });
        throw new Error(`Failed to get or create token account: ${msg}`);
      }

      const treeInfos = await getStateTreeInfos.call(rpc);
      const treeInfo = selectStateTreeInfo(
        Array.isArray(treeInfos) ? treeInfos : [],
      );
      const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
      const tokenPoolInfo = selectTokenPoolInfo(
        Array.isArray(tokenPoolInfos) ? tokenPoolInfos : [],
      );
      if (!tokenPoolInfo) {
        throw new Error("No token pool info available for compression.");
      }

      const compressIx = await programCompress({
        payer: payer.publicKey,
        owner: owner.publicKey,
        source: sourceTokenAccount.address,
        toAddress: owner.publicKey,
        amount,
        mint,
        outputStateTreeInfo: treeInfo,
        tokenPoolInfo,
      });

      const blockhashRes = await getBlockhash.call(rpc);
      const blockhash =
        typeof blockhashRes === "object" &&
        blockhashRes !== null &&
        "value" in blockhashRes &&
        blockhashRes.value?.blockhash
          ? (blockhashRes as { value: { blockhash: string } }).value.blockhash
          : (blockhashRes as { blockhash: string }).blockhash;
      const lastValidBlockHeight =
        typeof blockhashRes === "object" &&
        blockhashRes !== null &&
        "value" in blockhashRes &&
        blockhashRes.value?.lastValidBlockHeight != null
          ? (blockhashRes as { value: { lastValidBlockHeight: number } }).value
              .lastValidBlockHeight
          : ((blockhashRes as { lastValidBlockHeight?: number })
              .lastValidBlockHeight ?? 0);

      const additionalSigners = dedupeSigner
        ? dedupeSigner(payer, owner)
        : [payer];
      const tx = buildAndSign(
        [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
          compressIx,
        ],
        payer,
        blockhash,
        additionalSigners,
      );
      const sig = await sendAndConfirm(
        rpc,
        tx,
        { commitment: "confirmed" },
        { blockhash, lastValidBlockHeight },
      );
      await get().refresh(owner.publicKey);
      return typeof sig === "string" ? sig : String(sig);
    } catch (e) {
      const msg = getErrorMessage(e);
      set({ transferError: msg });
      throw e;
    }
  },

  createTokenPool: async (payer: Keypair, mint: PublicKey) => {
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    try {
      const ctoken = require("@lightprotocol/compressed-token") as {
        createTokenPool?: (
          rpc: unknown,
          payer: Keypair,
          mint: PublicKey,
          tokenProgramId?: PublicKey,
        ) => Promise<string>;
      };
      if (typeof ctoken?.createTokenPool !== "function") {
        throw new Error(
          "createTokenPool not found on @lightprotocol/compressed-token.",
        );
      }
      const sig = await ctoken.createTokenPool(rpc, payer, mint);
      return typeof sig === "string" ? sig : String(sig);
    } catch (e) {
      const msg = getErrorMessage(e);
      set({ transferError: msg });
      throw e;
    }
  },

  getOrCreateReceiveAta: async (
    payer: Keypair,
    recipient: PublicKey,
    mint: PublicKey,
  ) => {
    let rpc = get().rpc;
    if (!rpc) {
      rpc = loadStateless();
      set({ rpc });
    }
    if (!rpc) {
      set({ transferError: "Compression RPC unavailable." });
      throw new Error("Compression RPC unavailable.");
    }
    set({ transferError: null });
    const ctoken = require("@lightprotocol/compressed-token") as {
      getOrCreateAtaInterface?: (
        rpc: unknown,
        payer: Keypair,
        mint: PublicKey,
        owner: PublicKey,
        allowOwnerOffCurve?: boolean,
      ) => Promise<{
        parsed?: { address?: PublicKey; amount?: unknown };
        address?: PublicKey;
        amount?: unknown;
      }>;
    };
    if (typeof ctoken?.getOrCreateAtaInterface !== "function") {
      throw new Error(
        "getOrCreateAtaInterface not found. Install @lightprotocol/compressed-token.",
      );
    }
    const ata = await ctoken.getOrCreateAtaInterface(
      rpc,
      payer,
      mint,
      recipient,
      false,
    );
    const address =
      ata?.parsed?.address ?? (ata as { address?: PublicKey }).address;
    if (!address) {
      throw new Error("getOrCreateAtaInterface did not return an address.");
    }
    let amount: number | undefined;
    const raw = ata?.parsed?.amount ?? (ata as { amount?: unknown }).amount;
    if (raw != null) {
      amount =
        typeof raw === "number"
          ? raw
          : typeof (raw as { toNumber?: () => number }).toNumber === "function"
            ? (raw as { toNumber: () => number }).toNumber()
            : Number(raw);
    }
    return { address, amount };
  },

  clearError: () => set({ error: null }),
  clearTransferError: () => set({ transferError: null }),
  };
});
