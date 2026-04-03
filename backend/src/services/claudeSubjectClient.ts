import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_MATERIAL_CHARS = 100_000; // total context budget for materials

const SYSTEM_PROMPT = [
  "You are shedulAI's subject assistant — a focused academic tutor for a single university course.",
  "You have access to the course's actual materials: announcements, lecture notes, slides, and assignments.",
  "",
  "Rules:",
  "- Answer only based on the provided course context and materials.",
  "- Be specific and cite material names when relevant (e.g. 'According to Week 3 slides...').",
  "- If the answer isn't in the materials, say so clearly rather than guessing.",
  "- Keep answers concise and actionable for a student.",
  "- Help with understanding concepts, summarising content, and preparing for assignments.",
].join("\n");

interface SubjectChatInput {
  message: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  assignments: Array<{ name: string; deadline: string; completed: boolean }>;
}

function buildMaterialsContext(
  materials: Array<{ name: string; type: string; contentText: string | null; canvasUpdatedAt: Date | null }>,
): string {
  let budget = MAX_MATERIAL_CHARS;
  const parts: string[] = [];

  // Priority order: announcements → pages → files (newest first within each type)
  const ordered = [
    ...materials.filter((m) => m.type === "announcement"),
    ...materials.filter((m) => m.type === "page"),
    ...materials.filter((m) => m.type === "file").sort(
      (a, b) => (b.canvasUpdatedAt?.getTime() ?? 0) - (a.canvasUpdatedAt?.getTime() ?? 0),
    ),
  ];

  for (const m of ordered) {
    if (budget <= 0) break;
    if (!m.contentText) {
      parts.push(`[${m.type.toUpperCase()}] ${m.name} — (no extractable text)`);
      continue;
    }
    const text = m.contentText.slice(0, budget);
    parts.push(`[${m.type.toUpperCase()}] ${m.name}\n${text}`);
    budget -= text.length;
  }

  return parts.join("\n\n---\n\n");
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function generateSubjectAiResponse(
  input: SubjectChatInput,
): Promise<string> {
  const client = getClient();

  // Load course materials from DB.
  const materials = await prisma.courseMaterial.findMany({
    where: { courseId: input.courseId },
    select: { name: true, type: true, contentText: true, canvasUpdatedAt: true },
    orderBy: { canvasUpdatedAt: "desc" },
  });

  const materialsContext = buildMaterialsContext(materials);
  const hasMaterials = materials.length > 0;

  const userPrompt = [
    `Course: ${input.courseName} (${input.courseCode})`,
    "",
    "Assignments:",
    input.assignments
      .map(
        (a) =>
          `- ${a.name} | due ${a.deadline} | ${a.completed ? "completed" : "pending"}`,
      )
      .join("\n"),
    "",
    hasMaterials
      ? `Course Materials:\n\n${materialsContext}`
      : "No materials have been synced yet for this course.",
    "",
    `Student question: ${input.message}`,
  ].join("\n");

  if (!client) {
    return hasMaterials
      ? `I have access to ${materials.length} materials for ${input.courseName}. However, the AI service isn't configured. Please ensure ANTHROPIC_API_KEY is set on the backend.`
      : `No materials have been synced for ${input.courseName} yet. Use the "Sync Materials" button on this course page to import your Canvas content.`;
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = response.content[0];
    if (block?.type === "text" && block.text.trim()) {
      return block.text.trim();
    }
  } catch (error) {
    console.error("[Claude Subject] request failed:", error);
  }

  return `Sorry, I couldn't process your question about ${input.courseName} right now. Please try again.`;
}
