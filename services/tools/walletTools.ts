import { useAddressBookStore } from "@/store/addressBookStore";
import { useCompressedStore } from "@/store/compressedStore";
import { getWalletBalanceData } from "@/store/walletBalanceData";
import { useWalletStore } from "@/store/walletStore";
import { resolveRecipientToPublicKey } from "@/utils/recipientResolution";
import type { ToolHandler } from "./ToolFramework";
import { Tool } from "./ToolRegistry";

/** Handlers for MCP-style ToolFramework (definition comes from mcp/tools/*.json). */
export const WALLET_TOOL_HANDLERS: Record<string, ToolHandler> = {
  get_balance: {
    callFormat: "[get_balance()]",
    outputDescription:
      "Returns total, public, and shielded SOL (compressed balance = shielded). Same as Wallet screen: Total = Public + Shielded. Report all three.",
    responseInstructions:
      "Report Total balance, Public balance, and Shielded balance. Say e.g. 'Your total balance is X SOL (Public: Y SOL, Shielded: Z SOL).'",
    execute: async () => {
      try {
        const data = await getWalletBalanceData({ refresh: true });
        if (data.privateError === "No wallet loaded") {
          return { success: false, error: "No wallet loaded" };
        }
        const { totalSol, publicSol, privateSol, privateError } = data;
        return {
          success: true,
          result: {
            totalSol,
            publicSol,
            privateSol,
            privateError: privateError || undefined,
            summary: `Total: ${totalSol.toFixed(4)} SOL (Public: ${publicSol.toFixed(4)}, Shielded: ${privateSol.toFixed(4)})`,
          },
        };
      } catch (e: unknown) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Failed to fetch balance",
        };
      }
    },
  },
  get_private_balance: {
    callFormat: "[get_private_balance()]",
    outputDescription:
      "Returns the user's shielded (compressed) SOL balance. Same value shown on the Wallet screen as Shielded / Private.",
    responseInstructions:
      "Report the shielded balance in SOL. Say e.g. 'Your shielded balance is X SOL.'",
    execute: async () => {
      try {
        const data = await getWalletBalanceData({ refresh: true });
        if (data.privateError === "No wallet loaded") {
          return { success: false, error: "No wallet loaded" };
        }
        const { privateSol, privateError } = data;
        return {
          success: true,
          result: {
            privateSol,
            privateError: privateError || undefined,
            summary: `${privateSol.toFixed(4)} SOL (shielded)`,
          },
        };
      } catch (e: unknown) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Failed to fetch private balance",
        };
      }
    },
  },
  get_contacts: {
    callFormat: "[get_contacts()]",
    outputDescription:
      "Returns list of {name, address}. List the contacts or say 'No contacts' if empty.",
    responseInstructions: "Simply list the contact names found.",
    execute: async () => {
      const contacts = useAddressBookStore.getState().contacts;
      return {
        success: true,
        result: contacts.map((c) => ({ name: c.name, address: c.address })),
      };
    },
  },
  shield_funds: {
    callFormat: "[shield_funds(amount=0.5)]",
    outputDescription:
      "Returns txHash. Say 'X SOL has been converted to private SOL.'",
    responseInstructions:
      "Simply say 'X SOL has been converted to private SOL.'",
    execute: async ({ amount }) => {
      try {
        const wallet = useWalletStore.getState().wallet;
        if (!wallet) return { success: false, error: "No wallet loaded" };
        const txHash = await useCompressedStore
          .getState()
          .compressSol(wallet, wallet, amount as number);
        return {
          success: true,
          result: { txHash, status: "submitted", amount },
        };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    },
  },
  private_send: {
    callFormat: "[private_send(amount=0.1, recipient=base58_public_key_or_contact_name)]",
    outputDescription:
      "Returns txHash and recipient. Say 'X SOL was sent to [recipient].'",
    responseInstructions: "Simply say 'X SOL was sent to [recipient].'",
    execute: async ({ amount, recipient }) => {
      try {
        const wallet = useWalletStore.getState().wallet;
        if (!wallet) return { success: false, error: "No wallet loaded" };
        const recipientStr = typeof recipient === "string" ? recipient : String(recipient ?? "");
        const toPublicKey = resolveRecipientToPublicKey(recipientStr);
        const txHash = await useCompressedStore
          .getState()
          .transferCompressedSol(
            wallet,
            wallet,
            toPublicKey,
            amount as number,
          );
        return {
          success: true,
          result: { txHash, status: "submitted", recipient: toPublicKey.toBase58() },
        };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    },
  },
};

export const GetBalanceTool: Tool = {
  definition: {
    name: "get_balance",
    description: "Get the wallet's public SOL balance and shielded (compressed) SOL balance.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  responseInstructions:
    "Report Total, Public, and Shielded balance. Say e.g. 'Your total balance is X SOL (Public: Y SOL, Shielded: Z SOL).'",
  callFormat: "[get_balance()]",
  outputDescription:
    "Returns totalSol, publicSol, and shielded (privateSol) — same as Wallet screen: Total = Public + Shielded.",
  execute: async () => {
    try {
      const data = await getWalletBalanceData({ refresh: true });
      if (data.privateError === "No wallet loaded") {
        return { success: false, error: "No wallet loaded" };
      }
      const { totalSol, publicSol, privateSol, privateError } = data;
      return {
        success: true,
        result: {
          totalSol,
          publicSol,
          privateSol,
          privateError: privateError || undefined,
          summary: `Total: ${totalSol.toFixed(4)} SOL (Public: ${publicSol.toFixed(4)}, Shielded: ${privateSol.toFixed(4)})`,
        },
      };
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Failed to fetch balance",
      };
    }
  },
};

export const GetAddressBookTool: Tool = {
  definition: {
    name: "get_contacts",
    description: "Get the list of saved contacts from the address book.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  responseInstructions: "Simply list the contact names found.",
  callFormat: "[get_contacts()]",
  outputDescription:
    "Returns list of {name, address}. List the contacts or say 'No contacts' if empty.",
  execute: async () => {
    const contacts = useAddressBookStore.getState().contacts;
    return {
      success: true,
      result: contacts.map((c) => ({ name: c.name, address: c.address })),
    };
  },
};

export const ShieldFundsTool: Tool = {
  definition: {
    name: "shield_funds",
    description:
      "Convert public SOL to private SOL (compress into ZK Compression). Increases the user's private SOL balance.",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Amount of SOL to convert to private",
        },
      },
      required: ["amount"],
    },
  },
  responseInstructions: "Simply say 'X SOL has been converted to private SOL.'",
  callFormat: "[shield_funds(amount=0.5)]",
  outputDescription:
    "Returns txHash. Say 'X SOL has been converted to private SOL.'",
  execute: async ({ amount }) => {
    try {
      const wallet = useWalletStore.getState().wallet;
      if (!wallet) {
        return { success: false, error: "No wallet loaded" };
      }
      const txHash = await useCompressedStore
        .getState()
        .compressSol(wallet, wallet, amount);
      return {
        success: true,
        result: { txHash, status: "submitted", amount },
      };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};

export const PrivateTransferTool: Tool = {
  definition: {
    name: "private_send",
    description:
      "Send compressed SOL privately to another user via ZK Compression. Recipient is a Solana wallet address (public key).",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount of SOL to send" },
        recipient: {
          type: "string",
          description: "Recipient Solana wallet address (base58 public key)",
        },
      },
      required: ["amount", "recipient"],
    },
  },
  responseInstructions: "Simply say 'X SOL was sent to [recipient].'",
  callFormat: "[private_send(amount=0.1, recipient=base58_public_key)]",
  outputDescription:
    "Returns txHash and recipient. Say 'X SOL was sent to [recipient].'",
  execute: async ({ amount, recipient }) => {
    try {
      const wallet = useWalletStore.getState().wallet;
      if (!wallet) {
        return { success: false, error: "No wallet loaded" };
      }
      const recipientStr = typeof recipient === "string" ? recipient : String(recipient ?? "");
      const toPublicKey = resolveRecipientToPublicKey(recipientStr);
      const txHash = await useCompressedStore
        .getState()
        .transferCompressedSol(wallet, wallet, toPublicKey, amount);
      return {
        success: true,
        result: { txHash, status: "submitted", recipient: toPublicKey.toBase58() },
      };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};
