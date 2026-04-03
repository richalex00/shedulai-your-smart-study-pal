import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resolveUserId } from "../lib/resolveUserId";
import { generatePlannerAiResponse } from "../services/aiPlannerService";
import { generateSubjectAiResponse } from "../services/claudeSubjectClient";
import type { PlannerAiRequest, AiResponse } from "../types/ai";

const aiRoutes = Router();

function isPlannerRequest(body: unknown): body is PlannerAiRequest {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Partial<PlannerAiRequest>;
  return candidate.mode === "planner" && typeof candidate.message === "string";
}

interface SubjectAiRequestBody {
  mode: "subject";
  message: string;
  context: {
    course: { id: string; name: string; code: string };
    assignments: Array<{ name: string; deadline: string; completed: boolean }>;
  };
}

function isSubjectRequest(body: unknown): body is SubjectAiRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Partial<SubjectAiRequestBody>;
  return (
    b.mode === "subject" &&
    typeof b.message === "string" &&
    typeof b.context?.course?.id === "string"
  );
}

// POST /api/ai/planner
aiRoutes.post("/planner", async (req, res, next) => {
  try {
    if (!isPlannerRequest(req.body)) {
      return res.status(400).json({ error: "Invalid planner AI request body" });
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

// POST /api/ai/subject
aiRoutes.post("/subject", async (req, res, next) => {
  try {
    if (!isSubjectRequest(req.body)) {
      return res.status(400).json({ error: "Invalid subject AI request body" });
    }

    const userId = resolveUserId(req);
    const { course, assignments } = req.body.context;

    // Verify course belongs to this user.
    if (userId) {
      const owned = await prisma.course.findFirst({
        where: { id: course.id, userId },
        select: { id: true },
      });
      if (!owned) {
        return res.status(404).json({ error: "Course not found." });
      }
    }

    const content = await generateSubjectAiResponse({
      message: req.body.message,
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      assignments,
    });

    const response: AiResponse = { content };
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
});

// GET /api/ai/diagnose — test Anthropic connectivity (no auth required, safe for debugging)
aiRoutes.get("/diagnose", async (_req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ ok: false, reason: "ANTHROPIC_API_KEY is not set" });
  }

  const trimmed = apiKey.trim();
  if (trimmed !== apiKey) {
    return res.status(200).json({ ok: false, reason: "ANTHROPIC_API_KEY has leading/trailing whitespace" });
  }
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return res.status(200).json({ ok: false, reason: "ANTHROPIC_API_KEY has quotes around it — remove them in Railway" });
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: trimmed });
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
    return res.status(200).json({ ok: true, model: resp.model, stop_reason: resp.stop_reason });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(200).json({ ok: false, reason: msg });
  }
});

export default aiRoutes;
