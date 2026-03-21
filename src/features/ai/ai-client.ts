import { ApiAiClient } from "@/features/ai/ai-client.api";
import { MockAiClient } from "@/features/ai/ai-client.mock";
import type { AiClient, AiClientMode } from "@/features/ai/ai-types";

function resolveAiClientMode(): AiClientMode {
  const mode = import.meta.env.VITE_AI_CLIENT_MODE;

  return mode === "api" ? "api" : "mock";
}

function createAiClient(): AiClient {
  const mockClient = new MockAiClient();
  const mode = resolveAiClientMode();

  if (mode === "api") {
    return new ApiAiClient({
      baseUrl: import.meta.env.VITE_AI_API_BASE_URL,
      fallbackClient: mockClient,
    });
  }

  return mockClient;
}

export const aiClient: AiClient = createAiClient();
