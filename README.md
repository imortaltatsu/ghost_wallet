# Ghost Wallet - AI-Powered Conversational Interface

An Expo + React Native app with on-device AI capabilities using llama.rn for LLM inference and agentic task execution.

## Features

✅ **100% On-Device AI** - No internet required after model download
✅ **Real-time Streaming** - Token-by-token response generation
✅ **Model Management** - Download and switch between models
✅ **Chat History** - Persistent conversation storage
✅ **Agentic Tasks** - Execute calculator, timer, and custom tasks
✅ **GPU Acceleration** - OpenCL support for Android

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
   - **LiquidAI LFM2 350M (Recommended)** - 220MB, ultra-fast
   - **Llama 3.2 1B** - 750MB, balanced
   - **Llama 3.2 3B** - 2GB, higher quality
4. **Wait for download** to complete (progress shown)
5. **Start chatting!** The model runs 100% on your device

## Available Models

| Model | Size | Description |
|-------|------|-------------|
| LiquidAI LFM2 350M (Q4_K_M) | 220 MB | Ultra-fast, optimized for mobile |
| Llama 3.2 1B Instruct (Q4_K_M) | 750 MB | Balanced performance |
| Llama 3.2 3B Instruct (Q4_K_M) | 2.0 GB | Higher quality responses |
| Phi 3.5 Mini Instruct (Q4_K_M) | 2.2 GB | Strong reasoning & coding |

## Architecture

```
ghostwallet/
├── app/
│   ├── (tabs)/
│   │   └── ai-chat.tsx          # Main chat interface
│   └── settings/
│       └── ai-settings.tsx      # Model management
├── components/
│   └── chat/
│       ├── ChatContainer.tsx    # Chat UI container
│       ├── MessageBubble.tsx    # Message display
│       └── ChatInput.tsx        # Input component
├── services/
│   ├── llm/
│   │   └── LlamaService.ts      # LLM singleton
│   └── agent/
│       ├── AgentExecutor.ts     # Task execution
│       └── tasks/               # Built-in tasks
├── store/
│   ├── chatStore.ts             # Chat state
│   ├── llmStore.ts              # Model state
│   └── ttsStore.ts              # TTS settings
├── types/
│   └── chat.ts                  # TypeScript types
├── constants/
│   ├── Models.ts                # Model configs
│   └── TTSVoices.ts             # TTS voices
└── utils/
    └── modelDownloader.ts       # Download manager
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

## Agentic Tasks

The AI can execute on-device tasks:

### Calculator

```
User: "Calculate 15 * 234"
AI: *executes calculator task* "The result is 3510"
```

### Timer

```
User: "What time is it?"
AI: *executes timer task* "It's 9:47 PM"
```

### Custom Tasks

Add your own tasks in `services/agent/tasks/`:

```typescript
export const MyTask: AgentTask = {
  name: 'my_task',
  description: 'Description for the AI',
  parameters: { /* ... */ },
  async execute(params) {
    // Your on-device logic
    return { success: true, data: result };
  },
};
```

Register in `AgentExecutor`:

```typescript
import { agentExecutor } from '@/services/agent/AgentExecutor';
import { MyTask } from '@/services/agent/tasks/MyTask';

agentExecutor.registerTask(MyTask);
```

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
