import { ChatTemplate } from "@/utils/chatTemplate";
import { ModelDownloader as weightsDownloader } from "@/utils/modelDownloader";
import { llamaLoader } from "./LlamaService";
import { modelManager } from "./modelManager";
import { getModelInfo } from "./models";
import type { AiGenerateRequest, AiGenerateResult } from "./types";

/**
 * Thin wrapper around on-device LLM inference.
 *
 * We keep this isolated so we can swap providers (react-native-ai / MLC / etc.)
 * without touching UI code.
 */
export async function generateText(
  req: AiGenerateRequest,
): Promise<AiGenerateResult> {
  // Check if a model is installed first
  const modelId = req.modelId || (await modelManager.getCurrentModel());

  if (!modelId) {
    return {
      text: "No model installed. Please install a model first from the Models screen.",
      raw: null,
    };
  }

  const isInstalled = await modelManager.isInstalled(modelId);
  if (!isInstalled) {
    return {
      text: `Model "${modelId}" is not installed. Please install it first from the Models screen.`,
      raw: null,
      modelId,
    };
  }

  // Get model info to check for GGUF file
  const modelInfo = getModelInfo(modelId);

  // Get the actual quantization used when model was installed
  const installedModels = await modelManager.getInstalledModels();
  const installedModelInfo = installedModels[modelId];
  const quantization =
    (installedModelInfo as any)?.quantization ||
    modelInfo?.quantization ||
    "Q4_K_M";

  // Try to use llama.cpp loader with GGUF weights if available
  // In our app, all models in RECOMMENDED_MODELS are GGUF models
  if (modelInfo) {
    const weightsExist = await weightsDownloader.weightsExist(
      modelId,
      quantization,
    );

    if (weightsExist) {
      try {
        // Use llama.cpp loader for inference with chat template
        const session = await llamaLoader.getSession(modelId, quantization);

        // Use messages from request (context) or fallback to simple prompt
        const messages =
          req.messages && req.messages.length > 0
            ? req.messages
            : ChatTemplate.fromPrompt(req.prompt, req.systemPrompt);

        console.log("[LLM] Generating with model:", modelId);
        console.log("[LLM] Messages count:", messages.length);
        console.log(
          "[LLM] Last message:",
          messages[messages.length - 1]?.content?.substring(0, 100),
        );

        // Collect streaming tokens if callback provided
        let fullText = "";
        const onToken = req.onToken
          ? (token: string) => {
              fullText += token;
              req.onToken?.(token);
            }
          : undefined;

        const output = await session.generateChat(messages, {
          maxTokens: 512,
          temperature: 0.6,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.2,
          onToken,
          tools: req.tools,
        });

        console.log("[LLM] Output length:", fullText.length);
        console.log("[LLM] Output preview:", fullText.substring(0, 200));

        return {
          text: fullText || String(output || ""),
          raw: output,
          modelId,
        };
      } catch (llamaError: any) {
        const errMsg = String(llamaError?.message || llamaError).toLowerCase();
        if (
          errMsg.includes("cannot both be empty") ||
          errMsg.includes("empty output")
        ) {
          console.warn(
            "Model generated empty response with tools enabled. Retrying or ignoring.",
          );
          return {
            text: "...", // Return ellipsis to indicate potential processing or empty
            raw: "",
            modelId,
          };
        }
        console.error("Llama inference failed:", llamaError);
        throw llamaError;
      }
    } else {
      return {
        text: "Model weights found but verification failed.",
        raw: null,
        modelId,
      };
    }
  }

  return {
    text: "Model configuration not found.",
    raw: null,
    modelId,
  };
}
