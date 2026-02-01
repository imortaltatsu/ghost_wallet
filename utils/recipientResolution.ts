/**
 * Resolve recipient input (contact name or base58 address) to a Solana public key address.
 * Used by send SOL and private send so contact names work and invalid input gives a clear error.
 */

import { useAddressBookStore } from "@/store/addressBookStore";
import { PublicKey } from "@solana/web3.js";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Resolve recipient to a base58 public key string.
 * - If input matches a contact name (case-insensitive), returns that contact's address.
 * - If input looks like base58 and parses as PublicKey, returns it.
 * - Otherwise throws an error with a clear message.
 */
export function resolveRecipientToAddress(recipient: string): string {
  const trimmed = (recipient ?? "").trim();
  if (!trimmed) {
    throw new Error("Recipient is required. Enter a Solana address or a saved contact name.");
  }

  const contacts = useAddressBookStore.getState().contacts;
  const contact = contacts.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (contact) {
    return contact.address;
  }

  if (BASE58_REGEX.test(trimmed)) {
    try {
      new PublicKey(trimmed);
      return trimmed;
    } catch {
      // fall through to error
    }
  }

  throw new Error(
    `Recipient must be a Solana wallet address (base58) or a saved contact name. No contact named "${trimmed}" was found, and it doesn't look like a valid address.`,
  );
}

/**
 * Resolve recipient to a PublicKey. Use when you need PublicKey for RPC/SDK.
 */
export function resolveRecipientToPublicKey(recipient: string): PublicKey {
  const address = resolveRecipientToAddress(recipient);
  return new PublicKey(address);
}
