import type {
  PlannerAiContext,
  SubjectAiContext,
} from "@/features/ai/ai-context";

export type AiChatMode = "planner" | "subject";

export interface PlannerAiRequest {
  mode: "planner";
  message: string;
  context: PlannerAiContext;
}

export interface SubjectAiRequest {
  mode: "subject";
  message: string;
  context: SubjectAiContext;
}

export type AiRequest = PlannerAiRequest | SubjectAiRequest;

export interface AiResponse {
  content: string;
}

export type AiClientMode = "mock" | "api";

export interface AiClient {
  getSuggestedPrompts(): string[];
  respond(request: AiRequest): Promise<AiResponse>;
}
