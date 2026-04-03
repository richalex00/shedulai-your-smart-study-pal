import type {
  Assignment,
  Course,
  GroupProject,
  Preferences,
  TimeBlock,
} from "./types";

const today = new Date();

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const defaultPreferences: Preferences = {
  onboardingComplete: false,
  studyHours: "morning",
  aiMode: "assisted",
  noWorkAfter: 21,
  personalActivities: true,
  canvasConnected: false,
};

export const defaultCourses: Course[] = [
  { id: "1", name: "Machine Learning", code: "CS401", color: "study", isFavorite: false },
  { id: "2", name: "Data Structures", code: "CS201", color: "accent", isFavorite: false },
  { id: "3", name: "Statistics", code: "MATH301", color: "assignment", isFavorite: false },
  { id: "4", name: "Psychology", code: "PSY101", color: "personal", isFavorite: false },
];

export const defaultAssignments: Assignment[] = [
  {
    id: "a1",
    courseId: "1",
    name: "Neural Network Lab Report",
    deadline: formatDate(addDays(today, 2)),
    difficulty: "hard",
    completed: false,
  },
  {
    id: "a2",
    courseId: "2",
    name: "Binary Tree Implementation",
    deadline: formatDate(addDays(today, 4)),
    difficulty: "medium",
    completed: false,
  },
  {
    id: "a3",
    courseId: "3",
    name: "Probability Problem Set 5",
    deadline: formatDate(addDays(today, 1)),
    difficulty: "easy",
    completed: true,
  },
  {
    id: "a4",
    courseId: "4",
    name: "Research Essay Draft",
    deadline: formatDate(addDays(today, 7)),
    difficulty: "hard",
    completed: false,
  },
  {
    id: "a5",
    courseId: "1",
    name: "Read Chapter 8",
    deadline: formatDate(addDays(today, 3)),
    difficulty: "easy",
    completed: false,
  },
];

export const defaultTimeBlocks: TimeBlock[] = [
  {
    id: "t1",
    type: "study",
    title: "ML Study Session",
    courseId: "1",
    date: formatDate(today),
    startHour: 9,
    endHour: 11,
  },
  {
    id: "t2",
    type: "personal",
    title: "Gym 💪",
    date: formatDate(today),
    startHour: 12,
    endHour: 13,
  },
  {
    id: "t3",
    type: "assignment",
    title: "Prob Set 5",
    courseId: "3",
    date: formatDate(today),
    startHour: 14,
    endHour: 16,
  },
  {
    id: "t4",
    type: "study",
    title: "Data Structures Review",
    courseId: "2",
    date: formatDate(addDays(today, 1)),
    startHour: 10,
    endHour: 12,
  },
  {
    id: "t5",
    type: "personal",
    title: "Free Time 🎮",
    date: formatDate(addDays(today, 1)),
    startHour: 17,
    endHour: 19,
  },
  {
    id: "t6",
    type: "study",
    title: "Statistics Lecture Notes",
    courseId: "3",
    date: formatDate(addDays(today, 2)),
    startHour: 9,
    endHour: 10,
  },
  {
    id: "t7",
    type: "assignment",
    title: "Neural Net Report",
    courseId: "1",
    date: formatDate(addDays(today, 2)),
    startHour: 13,
    endHour: 16,
  },
];

export const defaultGroupProjects: GroupProject[] = [
  {
    id: "g1",
    name: "ML Final Project",
    courseId: "1",
    members: ["Alex", "Jordan", "Sam", "You"],
    suggestedTimes: [
      { id: "s1", label: "Tue 3–5 PM", votes: ["Alex", "You"] },
      { id: "s2", label: "Wed 1–3 PM", votes: ["Jordan", "Sam"] },
      { id: "s3", label: "Thu 4–6 PM", votes: ["Alex", "Jordan", "Sam"] },
    ],
  },
];
