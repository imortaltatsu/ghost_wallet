# Milestone 2: Agentic Privacy Wallet

GhostWallet **Milestone 2** delivers an **agentic privacy wallet**: a Solana wallet with on-device AI that can perform wallet actions via natural language (balance, send, shield, private send) using the same data and logic as the Wallet UI.

## Delivered

- **Wallet**
  - Send / receive SOL, address book
  - Shielded (ZK Compression) balance and flows: shield funds, private send
  - Public + shielded balance shown consistently in Wallet and in chat tool responses

- **On-device AI**
  - 100% local inference (llama.rn); no internet after model download
  - Model management in Settings (download, switch, delete)
  - Real-time streaming, GPU acceleration (Metal/Vulkan)

- **Agentic tools (MCP-style)**
  - `get_balance` – total, public, and shielded SOL (same source as Wallet screen)
  - `get_private_balance` – shielded balance only
  - `send_sol` – send public SOL
  - `shield_funds` – convert public SOL to shielded
  - `private_send` – send shielded SOL
  - `get_contacts` – list address book
  - Tool data from `store/walletBalanceData.ts`; shielded balance synced via `shieldedStore`

- **UX**
  - Chat history, dark mode across app
  - Terminology: “Shielded” for private/compressed balance in UI and tool messages

- **Release builds**
  - Android: `bun run android:apk` → release APK
  - iOS: `bun run buildipa` (macOS + Xcode; requires Apple Developer signing)

## Docs

- **[README.md](./README.md)** – Quick start, features, architecture
- **[BUILD.md](./BUILD.md)** – Android APK and iOS IPA build steps

## Version

Milestone 2 corresponds to **Ghost Wallet AI v1.0.0** (see Settings footer).
