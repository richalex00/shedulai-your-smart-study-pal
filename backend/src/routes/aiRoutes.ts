import { Router } from "express";
import { resolveUserId } from "../lib/resolveUserId";
import { generatePlannerAiResponse } from "../services/aiPlannerService";
import type { PlannerAiRequest, AiResponse } from "../types/ai";

const aiRoutes = Router();

function isPlannerRequest(body: unknown): body is PlannerAiRequest {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Partial<PlannerAiRequest>;
  return candidate.mode === "planner" && typeof candidate.message === "string";
}

aiRoutes.post("/planner", async (req, res, next) => {
  try {
    if (!isPlannerRequest(req.body)) {
      return res.status(400).json({
        error: "Invalid planner AI request body",
      });
    }

    const userId = resolveUserId(req);

    const content = await generatePlannerAiResponse({
      userId,
      message: req.body.message,
      clientContext: req.body.context,
    });

    const response: AiResponse = { content };
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
});

export default aiRoutes;
