import type {
  Assignment,
  Course,
  Preferences,
  TimeBlock,
} from "@/planner/types";

export interface PlannerAiContext {
  courses: Array<Pick<Course, "id" | "name" | "code">>;
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  preferences: Preferences;
}

export interface SubjectAiContext {
  course: Pick<Course, "id" | "name" | "code">;
  assignments: Assignment[];
  materialNames: string[];
}

export function buildPlannerAiContext({
  courses,
  assignments,
  timeBlocks,
  preferences,
}: {
  courses: Course[];
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  preferences: Preferences;
}): PlannerAiContext {
  return {
    courses: courses.map(({ id, name, code }) => ({ id, name, code })),
    assignments,
    timeBlocks,
    preferences,
  };
}

export function buildSubjectAiContext({
  course,
  assignments,
  materialNames,
}: {
  course: Course;
  assignments: Assignment[];
  materialNames: string[];
}): SubjectAiContext {
  return {
    course: {
      id: course.id,
      name: course.name,
      code: course.code,
    },
    assignments,
    materialNames,
  };
}
