import OpenAI from "openai";
import type { PlannerAiContext } from "../types/planner";

const DEFAULT_MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT = [
  "You are shedulAI, an AI academic planning assistant for university students.",
  "Your role is to turn planner data into realistic, practical next actions.",
  "",
  "Rules:",
  "- Use only the provided planner context. Do not invent courses, deadlines, or events.",
  "- Prioritize by deadline urgency, difficulty, and student preferences.",
  "- Respect constraints such as no-work-after time.",
  "- Give concise, actionable output suitable for an MVP student planner UI.",
  "- If context is incomplete, explain assumptions briefly and still provide a useful plan.",
  "",
  "Response style:",
  "- Start with top priority.",
  "- Then provide a short plan for today/this week.",
  "- Keep tone calm, supportive, and specific.",
].join("\n");

function buildPlannerUserPrompt(message: string, context: PlannerAiContext) {
  return [
    `User message: ${message}`,
    "Planner context JSON:",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "Task: Give practical planning advice for today/this week based on the context.",
  ].join("\n\n");
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export async function generatePlannerAiContentWithOpenAI({
  message,
  context,
}: {
  message: string;
  context: PlannerAiContext;
}): Promise<string | null> {
  const client = getOpenAiClient();

  if (!client) {
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const userPrompt = buildPlannerUserPrompt(message, context);

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    return content;
  } catch (error) {
    console.error("OpenAI planner request failed", error);
    return null;
  }
}
