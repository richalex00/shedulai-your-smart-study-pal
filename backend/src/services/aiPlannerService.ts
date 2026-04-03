import { getPlannerContextForUser } from "./plannerContextService";
import type { PlannerAiContext } from "../types/planner";
import { generatePlannerAiContentWithClaude } from "./claudePlannerClient";

export interface PlannerAiInput {
  userId?: string;
  message: string;
  clientContext?: PlannerAiContext;
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function buildFallbackPlannerResponse(
  message: string,
  context: PlannerAiContext,
) {
  const openAssignments = context.assignments.filter(
    (assignment) => !assignment.completed,
  );
  const nextAssignment = [...openAssignments]
    .sort(
      (first, second) =>
        new Date(first.deadline).getTime() -
        new Date(second.deadline).getTime(),
    )
    .at(0);

  if (!nextAssignment) {
    return `You're in a good spot right now. I don't see any pending assignments.\n\nMessage received: "${truncate(message, 140)}"\n\nWant me to help you plan focused study blocks for this week anyway?`;
  }

  const course = context.courses.find(
    (item) => item.id === nextAssignment.courseId,
  );
  const courseLabel = course
    ? `${course.name} (${course.code})`
    : "your course";

  return [
    `Based on your current planner data, prioritize **${nextAssignment.name}** for **${courseLabel}**.`,
    `Due date: ${nextAssignment.deadline}. Difficulty: ${nextAssignment.difficulty}.`,
    ``,
    `I used your server-side planner context${context.preferences.studyHours ? ` and your ${context.preferences.studyHours} focus preference` : ""}.`,
    ``,
    `Message received: "${truncate(message, 140)}"`,
  ].join("\n");
}

async function resolvePlannerContext({
  userId,
  clientContext,
}: {
  userId?: string;
  clientContext?: PlannerAiContext;
}): Promise<PlannerAiContext> {
  if (userId) {
    try {
      return await getPlannerContextForUser(userId);
    } catch {
      // Fall through to client context fallback for MVP compatibility.
    }
  }

  if (clientContext) {
    return clientContext;
  }

  throw new Error(
    "Unable to resolve planner context from server or client payload",
  );
}

export async function generatePlannerAiResponse(
  input: PlannerAiInput,
): Promise<string> {
  const context = await resolvePlannerContext({
    userId: input.userId,
    clientContext: input.clientContext,
  });

  const claudeContent = await generatePlannerAiContentWithClaude({
    message: input.message,
    context,
  });

  if (claudeContent) {
    return claudeContent;
  }

  return buildFallbackPlannerResponse(input.message, context);
}
