import Anthropic from "@anthropic-ai/sdk";
import type { PlannerAiContext } from "../types/planner";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = [
  "You are shedulAI, an AI academic planning assistant for university students.",
  "Your role is to turn planner data into realistic, practical next actions.",
  "",
  "Rules:",
  "- Use only the provided planner context. Do not invent courses, deadlines, or events.",
  "- Prioritize by deadline urgency and student preferences.",
  "- Respect constraints such as no-work-after time.",
  "- Give concise, actionable output suitable for a student planner UI.",
  "- If context is incomplete, explain assumptions briefly and still provide a useful plan.",
  "",
  "Response style:",
  "- Start with top priority.",
  "- Then provide a short plan for today/this week.",
  "- Keep tone calm, supportive, and specific.",
  "- Use markdown bold for assignment/course names.",
  "- Keep responses under 200 words.",
].join("\n");

function buildUserPrompt(message: string, context: PlannerAiContext) {
  return [
    `User message: ${message}`,
    "",
    "Planner context:",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "",
    "Give practical planning advice for today/this week based on the context.",
  ].join("\n");
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function generatePlannerAiContentWithClaude({
  message,
  context,
}: {
  message: string;
  context: PlannerAiContext;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(message, context) }],
    });

    const block = response.content[0];
    if (block?.type === "text" && block.text.trim()) {
      return block.text.trim();
    }

    return null;
  } catch (error) {
    console.error("[Claude] planner request failed:", error);
    return null;
  }
}
