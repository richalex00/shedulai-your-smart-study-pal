export interface PlannerAiContext {
  courses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  assignments: Array<{
    id: string;
    courseId: string;
    name: string;
    deadline: string;
    difficulty: "easy" | "medium" | "hard" | null;
    completed: boolean;
  }>;
  timeBlocks: Array<{
    id: string;
    type: "study" | "personal" | "assignment";
    title: string;
    courseId?: string;
    date: string;
    startHour: number;
    endHour: number;
  }>;
  preferences: {
    onboardingComplete: boolean;
    studyHours: "morning" | "afternoon" | "evening";
    aiMode: "assisted" | "automatic";
    noWorkAfter: number;
    personalActivities: boolean;
    canvasConnected: boolean;
  };
}

export type PlannerCourseContext = PlannerAiContext["courses"][number];
export type PlannerAssignmentContext = PlannerAiContext["assignments"][number];
export type PlannerTimeBlockContext = PlannerAiContext["timeBlocks"][number];
export type PlannerPreferencesContext = PlannerAiContext["preferences"];
