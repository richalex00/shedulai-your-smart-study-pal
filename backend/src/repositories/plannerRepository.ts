import { prisma } from "../lib/prisma";

export interface PlannerRepositoryCourse {
  id: string;
  name: string;
  code: string;
}

export interface PlannerRepositoryAssignment {
  id: string;
  courseId: string;
  name: string;
  deadline: Date;
  difficulty: "easy" | "medium" | "hard" | null;
  completed: boolean;
}

export interface PlannerRepositoryTimeBlock {
  id: string;
  type: "study" | "personal" | "assignment";
  title: string;
  courseId: string | null;
  date: Date;
  startHour: number;
  endHour: number;
}

export interface PlannerRepositoryPreferences {
  onboardingComplete: boolean;
  studyHours: "morning" | "afternoon" | "evening";
  aiMode: "assisted" | "automatic";
  noWorkAfter: number;
  personalActivities: boolean;
  canvasToken: string | null;
}

export interface PlannerRepositoryData {
  courses: PlannerRepositoryCourse[];
  assignments: PlannerRepositoryAssignment[];
  timeBlocks: PlannerRepositoryTimeBlock[];
  preferences: PlannerRepositoryPreferences | null;
}

export async function getPlannerDataByUserId(
  userId: string,
): Promise<PlannerRepositoryData> {
  const [courses, assignments, timeBlocks, preferences] = await Promise.all([
    prisma.course.findMany({
      where: {
        userId,
        isArchived: false,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
    prisma.assignment.findMany({
      where: { userId },
      orderBy: { deadline: "asc" },
      select: {
        id: true,
        courseId: true,
        name: true,
        deadline: true,
        difficulty: true,
        completed: true,
      },
    }),
    prisma.timeBlock.findMany({
      where: { userId },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
      select: {
        id: true,
        type: true,
        title: true,
        courseId: true,
        date: true,
        startHour: true,
        endHour: true,
      },
    }),
    prisma.preferences.findUnique({
      where: { userId },
      select: {
        onboardingComplete: true,
        studyHours: true,
        aiMode: true,
        noWorkAfter: true,
        personalActivities: true,
        canvasToken: true,
      },
    }),
  ]);

  return {
    courses,
    assignments,
    timeBlocks,
    preferences,
  };
}
