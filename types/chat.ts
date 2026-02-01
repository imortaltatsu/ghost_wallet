export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface StreamingState {
  isStreaming: boolean;
  currentMessageId: string | null;
  accumulatedText: string;
}

/** KV cache dtype for compression (llama.rn / llama.cpp). */
export type KvCacheType =
  | "f16"
  | "f32"
  | "q8_0"
  | "q4_0"
  | "q4_1"
  | "iq4_nl"
  | "q5_0"
  | "q5_1";

export interface ModelConfig {
  modelPath: string;
  modelName: string;
  contextSize: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  nGpuLayers: number;
  nPredict: number;
  /** KV cache dtype for K (q4_0 = compressed). */
  cacheTypeK?: KvCacheType;
  /** KV cache dtype for V (q4_0 = compressed). */
  cacheTypeV?: KvCacheType;
}

export interface ModelInfo {
  id: string;
  name: string;
  url: string;
  size: string;
  sizeBytes: number;
  quantization: string;
  description: string;
  recommended?: boolean;
  downloaded?: boolean;
  localPath?: string;
  /** Optional display aliases (e.g. "ghost ai", "ghost ai pro") for search/typo matching */
  aliases?: string[];
}

export interface DownloadProgress {
  modelId: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  status: "idle" | "downloading" | "completed" | "error";
  error?: string;
}

export interface AgentTask {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<TaskResult>;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: "male" | "female";
}

export interface ChatSettings {
  ttsEnabled: boolean;
  selectedVoice: string;
  autoPlayTTS: boolean;
  streamingEnabled: boolean;
}
