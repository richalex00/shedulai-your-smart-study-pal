import {
  getMockGlobalAiResponse,
  getMockSubjectAiResponse,
  suggestedPrompts,
} from "@/features/ai/ai-mocks";
import type { AiClient, AiRequest, AiResponse } from "@/features/ai/ai-types";

export class MockAiClient implements AiClient {
  getSuggestedPrompts() {
    return suggestedPrompts;
  }

  async respond(request: AiRequest): Promise<AiResponse> {
    if (request.mode === "planner") {
      return {
        content: getMockGlobalAiResponse(request.message, request.context),
      };
    }

    return {
      content: getMockSubjectAiResponse(request.message, request.context),
    };
  }
}
