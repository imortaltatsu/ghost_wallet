# Light Protocol Shielded SOL in React Native

Options for doing **Light Protocol shielded SOL** (shield / private transfer / unshield) from a React Native app.

## Official docs: [zkcompression.com](https://www.zkcompression.com/home)

The current docs at **[zkcompression.com](https://www.zkcompression.com/home)** focus on the **new** Light Protocol stack:

- **@lightprotocol/stateless.js** – TypeScript SDK for compressed accounts ([ref](https://www.zkcompression.com/api-reference/libraries/stateless-js))
- **@lightprotocol/compressed-token** – Client for compressed tokens ([ref](https://www.zkcompression.com/api-reference/libraries/compressed-token))
- **Light Token** – rent-free token program ([Light Token welcome](https://www.zkcompression.com/light-token/welcome))

**Client Guide** (step-by-step TypeScript/Rust): [Client Guide](https://www.zkcompression.com/client-library/client-guide) – create, update, close, reinit, burn compressed accounts; RPC setup (`createRpc`), address derivation, validity proof, `PackedAccounts`, instruction data, full code examples.

That stack is for **ZK Compression** (rent-free PDAs, compressed tokens, light-token) and **wallet support** ([Add wallet support for compressed tokens](https://www.zkcompression.com/compressed-tokens/advanced-guides/add-wallet-support-for-compressed-tokens)). It is **not** the same as **shielded SOL** (privacy transfers with zk.js). Shielded SOL uses **@lightprotocol/zk.js** (older v1 flow; [shield.lightprotocol.com](https://shield.lightprotocol.com) has disabled new deposits). For **compressed tokens / Light Token in React Native**, use stateless.js + compressed-token per zkcompression.com; for **shielded SOL**, use the options below.

## 1. In-app with `@lightprotocol/zk.js` (preferred when it works)

- **What**: Use the official zk.js SDK in the app. Requires Node-like globals (Buffer, process, stream, crypto, **util**, assert).
- **Setup**: Metro must **not** stub `util` or `assert` (see `metro.config.js`: only stub `fs`, `child_process`, etc.). Polyfills run first in `_layout.tsx` and `utils/polyfills.ts`.
- **If it fails**: You’ll see “Shielded SDK failed to load” and can tap **“Open Light Shield in browser”** as a fallback.

## 2. Open in browser (fallback in this app)

- **What**: When in-app zk.js fails, the shielded screen shows **“Open Light Shield in browser”**, which opens [https://shield.lightprotocol.com](https://shield.lightprotocol.com) in the system/in-app browser.
- **Limitation**: Light Shield v1 has **disabled new deposits**; only **unshield** is available there. Full shield/transfer in browser would require a custom or v3 flow.

## 3. WebView with a page that runs zk.js

- **What**: Embed a WebView that loads a **web page** (your own or hosted) that uses `@lightprotocol/zk.js` in a full browser context. zk.js often works in WebView because it’s a full JS environment.
- **Flow**: App opens a URL (e.g. your backend serving a small HTML/JS app). That page loads zk.js from a CDN, connects wallet (e.g. via `postMessage` with the app), and runs shield/transfer/unshield. The app would need to inject or sign from the native side (e.g. via `postMessage` / `injectedJavaScript`).
- **Caveat**: You must handle key/signing securely (e.g. app signs, WebView only assembles and submits, or use a safe bridge).

## 4. Backend relayer (Node.js with zk.js)

- **What**: Run a **Node.js server** that uses `@lightprotocol/zk.js` and your relayer. The mobile app does **not** run zk.js; it calls your API (e.g. “shield 0.5 SOL”, “private transfer 0.1 SOL to X”).
- **Caveat**: The relayer needs to **sign** on behalf of the user for shielded ops, so either:
  - The user’s key material is on the server (custodial, security risk), or
  - The app signs partial payloads and the server assembles and submits (possible but you must design the protocol and use the relayer’s expected APIs).
- **References**: [Light Protocol relayer](https://github.com/Lightprotocol/light-protocol) (relayer URL in Provider), [example-nodejs-client](https://github.com/Lightprotocol/example-nodejs-client).

## 5. ZK Compression / stateless.js (different feature set – current docs)

- **What**: [zkcompression.com](https://www.zkcompression.com/home) documents **ZK Compression** and **Light Token** via `@lightprotocol/stateless.js` and `@lightprotocol/compressed-token`. That’s **rent-free accounts/tokens**, not **shielded SOL** (privacy transfers).
- **Use**: For **compressed tokens, Light Token, wallet support** in RN, follow [Add wallet support for compressed tokens](https://www.zkcompression.com/compressed-tokens/advanced-guides/add-wallet-support-for-compressed-tokens) and the [Client development](https://www.zkcompression.com/resources/sdks/client-development) overview. For **shielded SOL** (shield/transfer/unshield), you need zk.js or one of the alternatives above.

## 6. Transfer compressed SOL (Light System Program Invoke)

The [Light Protocol program-tests](https://github.com/Lightprotocol/light-protocol/blob/9abe4203/program-tests/utils/src/system_program.rs#L121-L178) implement **transfer of compressed SOL** via the **Light System Program** `Invoke` instruction (Rust):

- **`transfer_compressed_sol_test`** (lines 121–178): Takes `input_compressed_accounts` (sender’s compressed accounts), `recipients`, and `output_merkle_tree_pubkeys`. Splits `input_lamports` among output accounts, builds `output_compressed_accounts` with new owners (`recipients[i]`), reuses addresses from input where applicable, then calls **`compressed_transaction_test`**.
- **`compressed_transaction_test`** / **`create_invoke_instruction`**: Fetches a validity proof (input hashes + new addresses), builds the **Light System Program** `Invoke` instruction (input/output compressed accounts, merkle contexts, proof, no `compress_or_decompress_lamports`), and sends the transaction.

So **compressed SOL** can be moved between compressed accounts (change of ownership) without decompressing to a system account. This is a different path from:

- **zk.js** (this app’s “Private Send”): shielded SOL / UTXO-style private transfers.
- **stateless.js + compressed-token**: compressed **tokens** (SPL/light-token) via `transferInterface`; compressed **SOL** balance is exposed via `getCompressedBalanceByOwner` but moving it between owners would use the **Light System Program Invoke** flow as in the Rust reference.

To implement the same “transfer compressed SOL” flow in TypeScript you’d need the JS equivalent of `create_invoke_instruction` (e.g. from stateless.js or a light-system-program JS package): get sender’s compressed account(s), validity proof, build output compressed accounts (sender change + recipient), then build and send the Invoke instruction. The linked Rust code is the canonical reference for the instruction shape and test flow.

## Related: Mobile ZK proof → Solana verification

**[zk-solana-mobile-verifier](https://github.com/greg0x/zk-solana-mobile-verifier)** is an E2E PoC for **generating ZK proofs on mobile** (React Native + mopro) and **verifying them on Solana** via groth16-solana (Light Protocol):

- **Flow**: Mobile app generates a Groth16 proof (Circom, BN254) → converts proof bytes (e.g. **negate proof.A's y-coordinate** for groth16-solana) → sends transaction to Solana → Anchor program verifies with embedded VK.
- **Stack**: mopro (Rust lib for proof gen), React Native, polyfills (Buffer/crypto), @solana/web3.js, Anchor verifier program.
- **Use case**: Different from shielded SOL — this is "prove on device, verify on-chain" (e.g. attestations, privacy proofs). Useful reference for **proof format conversion** (mopro/snarkjs → groth16-solana) and **RN + Solana + ZK** setup.

## Summary

| Option               | Shielded SOL in RN?    | Effort | Notes                                       |
| -------------------- | ---------------------- | ------ | ------------------------------------------- |
| In-app zk.js         | Yes (if polyfills ok)  | Done   | Metro util/assert fix + polyfills           |
| Open in browser      | Unshield only (v1)     | Done   | Fallback button in app                      |
| WebView + zk.js page | Yes                    | Medium | Full browser context; secure signing needed |
| Backend relayer      | Yes                    | High   | Key handling / protocol design              |
| stateless.js         | No (different feature) | N/A    | Use for compressed accounts/tokens          |

For **shielded SOL in React Native**, the practical paths are: get **in-app zk.js** working with the current Metro/polyfill setup, or add a **WebView** that loads a page running zk.js and wire signing from the app.
