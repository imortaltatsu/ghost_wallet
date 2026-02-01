# GhostWallet

AI-powered privacy wallet: Solana wallet with on-device AI (llama.rn) and conversational tools for balance, send, shield, and private send.

**Milestone 2: Agentic Privacy Wallet** — Wallet + shielded (ZK Compression) flows + on-device AI that can run wallet actions from chat (same data as Wallet screen). See **[MILESTONE.md](./MILESTONE.md)** for scope and deliverables.

## Features

✅ **Wallet** – Send / receive SOL, private send (compressed SOL), address book, shielded (ZK Compression) balance  
✅ **100% On-Device AI** – No internet required after model download  
✅ **Real-time streaming** – Token-by-token responses  
✅ **Wallet tools in chat** – Ask for balance, send SOL, shield funds, private send; tools use the same data as the Wallet screen  
✅ **Model management** – Download and switch models in Settings  
✅ **Chat history** – Persistent conversations  
✅ **Dark mode** – Supported across app  
✅ **GPU acceleration** – OpenCL on Android

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Generate Native Projects

```bash
bun run prebuild
```

This will generate iOS and Android native projects with llama.rn configured.

### 3. Run the App

**iOS:**

```bash
bun run ios
```

**Android:**

```bash
bun run android
```

## First-Time Setup

1. **Launch the app** and navigate to the "AI Chat" tab
2. **Tap "Select Model"** to go to AI Settings
3. **Choose a model** to download:
   - **Ghost AI (LFM2 350M, Recommended)** - ~230MB, ultra-fast
   - **LFM2.5 1.2B Instruct** - ~750MB, larger instruct model
4. **Wait for download** to complete (progress shown)
5. **Start chatting!** The model runs 100% on your device

## Available Models

| Model                         | Size    | Description                       |
| ----------------------------- | ------- | --------------------------------- |
| Ghost AI (LFM2 350M Q4_K_M)   | ~230 MB | Ultra-fast, optimized for mobile  |
| LFM2.5 1.2B Instruct (Q4_K_M) | ~731 MB | Larger instruct model             |
| LFM2.5 1.2B Thinking (Q4_0)   | ~696 MB | Thinking / chain-of-thought model |

### Optional: Pre-download via CLI

Use the **exact** Hugging Face filenames (PascalCase). Example:

```bash
pip install huggingface-hub
huggingface-cli download LiquidAI/LFM2.5-1.2B-Instruct-GGUF LFM2.5-1.2B-Instruct-Q4_K_M.gguf --local-dir .
huggingface-cli download LiquidAI/LFM2.5-1.2B-Thinking-GGUF LFM2.5-1.2B-Thinking-Q4_0.gguf --local-dir .
```

## Building release builds

- **Android APK:** `bun run android:apk` → `android/app/build/outputs/apk/release/app-release.apk`
- **iOS IPA:** `bun run buildipa` (macOS + Xcode; sets up `ios/` and ExportOptions if needed; first run: set your teamID in `ios/ExportOptions.plist` then run again)

See **[BUILD.md](./BUILD.md)** for details (Android SDK, iOS teamID/export options, production signing).

## Architecture

```
ghostwallet/
├── app/
│   ├── index.tsx, _layout.tsx
│   ├── settings/ai-settings.tsx
│   └── wallet/                 # Send, receive, private-send, address-book, shielded
├── components/chat/             # ChatContainer, MessageBubble, ChatInput, LlmOutputRenderer
├── sdk/chat/                    # ChatSession, tool response formatting
├── sdk/tools/                   # Tool registration, getToolsForChatML, executeTool
├── services/
│   ├── llm/                     # LlamaService, textGenerator
│   ├── tools/                   # walletTools, ToolFramework, ToolRegistry
│   ├── mcp/                     # loadMCP (tool definitions)
│   └── rpc/                     # solanaRpcClient
├── store/
│   ├── walletStore, compressedStore, shieldedStore, walletBalanceData
│   ├── chatStore, llmStore, addressBookStore, settingsStore
│   └── ...
├── mcp/tools/                   # get_balance, get_private_balance, send_sol, shield_funds, etc.
└── utils/                       # chatTemplate, chatml, modelDownloader, polyfills
```

## Configuration

### Model Settings

Edit model parameters in AI Settings:

- **Temperature** (0.0-1.0): Controls randomness
- **Context Size**: Maximum conversation history
- **GPU Layers**: Number of layers on GPU (99 = all)

### Default Configuration

```typescript
{
  contextSize: 2048,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  nGpuLayers: 99,
  nPredict: 512,
}
```

## Wallet tools in chat

The AI can use MCP-style tools (see `services/tools/walletTools.ts` and `mcp/tools/*.json`):

- **get_balance** – Total, public, and shielded SOL (same source as Wallet screen)
- **get_private_balance** – Shielded (compressed) balance only
- **send_sol** – Send public SOL
- **shield_funds** – Convert public SOL to shielded (compressed)
- **private_send** – Send shielded SOL
- **get_contacts** – List address book

Balance data comes from `store/walletBalanceData.ts` (synced with `shieldedStore` for shielded balance).

## Performance Tips

1. **Start with smaller models** (LFM2 350M) for testing
2. **Enable GPU acceleration** (default: 99 layers)
3. **Adjust context size** based on device memory
4. **Clear chat history** periodically to free memory

## Troubleshooting

### Model won't download

- Check available storage space
- Ensure stable internet connection
- Try downloading a smaller model first

### App crashes during inference

- Reduce context size (try 1024 instead of 2048)
- Reduce GPU layers (try 20 instead of 99)
- Use a smaller model

### Slow generation

- Increase GPU layers for better acceleration
- Close other apps to free memory
- Consider using a smaller model

## Development

### Clean Rebuild

```bash
bun run prebuild:clean
```

### Add New Dependencies

```bash
bun add <package-name>
# or
expo install <package-name>
```

## Tech Stack

- **Expo SDK 54** - React Native framework
- **llama.rn** - On-device LLM inference
- **Zustand** - State management
- **React Native FS** - File system access
- **AsyncStorage** - Persistent storage
- **Markdown Display** - Rich text rendering

## License

MIT

## Credits

- **llama.rn** by [@mybigday](https://github.com/mybigday/llama.rn)
- **LiquidAI LFM2** models
- **Meta Llama** models
- **Microsoft Phi** models
