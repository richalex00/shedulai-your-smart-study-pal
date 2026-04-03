import type { PlannerAiContext } from "../types/planner";
import { getPlannerDataByUserId } from "../repositories/plannerRepository";

const defaultPreferences: PlannerAiContext["preferences"] = {
  onboardingComplete: false,
  studyHours: "morning",
  aiMode: "assisted",
  noWorkAfter: 21,
  personalActivities: true,
  canvasConnected: false,
};

function toDateOnlyIso(date: Date) {
  return date.toISOString().split("T")[0];
}

export async function getPlannerContextForUser(
  userId: string,
): Promise<PlannerAiContext> {
  const data = await getPlannerDataByUserId(userId);

  return {
    courses: data.courses.map((course) => ({
      id: course.id,
      name: course.name,
      code: course.code,
    })),
    assignments: data.assignments.map((assignment) => ({
      id: assignment.id,
      courseId: assignment.courseId,
      name: assignment.name,
      deadline: toDateOnlyIso(assignment.deadline),
      difficulty: assignment.difficulty,
      completed: assignment.completed,
    })),
    timeBlocks: data.timeBlocks.map((timeBlock) => ({
      id: timeBlock.id,
      type: timeBlock.type,
      title: timeBlock.title,
      courseId: timeBlock.courseId ?? undefined,
      date: toDateOnlyIso(timeBlock.date),
      startHour: timeBlock.startHour,
      endHour: timeBlock.endHour,
    })),
    preferences: data.preferences
      ? {
          onboardingComplete: data.preferences.onboardingComplete,
          studyHours: data.preferences.studyHours,
          aiMode: data.preferences.aiMode,
          noWorkAfter: data.preferences.noWorkAfter,
          personalActivities: data.preferences.personalActivities,
          canvasConnected: data.preferences.canvasToken !== null,
        }
      : defaultPreferences,
  };
}
