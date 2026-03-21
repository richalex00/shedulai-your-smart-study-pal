import type { PlannerAiContext } from "./planner";

export interface PlannerAiRequest {
  mode: "planner";
  message: string;
  context?: PlannerAiContext;
}

export interface AiResponse {
  content: string;
}
