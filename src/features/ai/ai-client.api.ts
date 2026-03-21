import { suggestedPrompts } from "@/features/ai/ai-mocks";
import type { AiClient, AiRequest, AiResponse } from "@/features/ai/ai-types";
import { STORAGE_KEYS } from "@/planner/persistence";

function getCurrentUserId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.currentUserId);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function getAiEndpoint(request: AiRequest, baseUrl?: string) {
  const root = baseUrl ?? "";

  if (request.mode === "planner") {
    return `${root}/api/ai/planner`;
  }

  return `${root}/api/ai/subject`;
}

export class ApiAiClient implements AiClient {
  constructor(
    private readonly options: {
      baseUrl?: string;
      fallbackClient?: AiClient;
    } = {},
  ) {}

  getSuggestedPrompts() {
    return suggestedPrompts;
  }

  async respond(request: AiRequest): Promise<AiResponse> {
    try {
      const endpoint = getAiEndpoint(request, this.options.baseUrl);
      const userId = getCurrentUserId();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data = (await response.json()) as Partial<AiResponse>;

      if (typeof data.content !== "string") {
        throw new Error("AI API response missing content");
      }

      return {
        content: data.content,
      };
    } catch (error) {
      if (this.options.fallbackClient) {
        return this.options.fallbackClient.respond(request);
      }

      throw error;
    }
  }
}
