export interface Course {
  id: string;
  name: string;
  code: string;
  color: "study" | "personal" | "assignment" | "accent";
}

export interface Assignment {
  id: string;
  courseId: string;
  name: string;
  deadline: string;
  difficulty: "easy" | "medium" | "hard";
  completed: boolean;
}

export interface TimeBlock {
  id: string;
  type: "study" | "personal" | "assignment";
  title: string;
  courseId?: string;
  date: string;
  startHour: number;
  endHour: number;
}

export interface SuggestedTime {
  id: string;
  label: string;
  votes: string[];
}

export interface GroupProject {
  id: string;
  name: string;
  courseId: string;
  members: string[];
  suggestedTimes: SuggestedTime[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

export interface Preferences {
  onboardingComplete: boolean;
  studyHours: "morning" | "afternoon" | "evening";
  aiMode: "assisted" | "automatic";
  noWorkAfter: number;
  personalActivities: boolean;
}
