import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  defaultAssignments,
  defaultCourses,
  defaultGroupProjects,
  defaultPreferences,
  defaultTimeBlocks,
} from "@/planner/mock-data";
import {
  getUserStorageKey,
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from "@/planner/persistence";
import type {
  Assignment,
  ChatMessage,
  Course,
  GroupProject,
  Preferences,
  TimeBlock,
} from "@/planner/types";

export type {
  Assignment,
  ChatMessage,
  Course,
  GroupProject,
  Preferences,
  TimeBlock,
} from "@/planner/types";

interface AppState {
  currentUserId: string | null;
  isUserLoading: boolean;
  isOnboarded: boolean;
  courses: Course[];
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  groupProjects: GroupProject[];
  chatMessages: ChatMessage[];
  preferences: Preferences;
  identifyWithEmail: (email: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  switchUser: () => void;
  setCourses: (c: Course[]) => void;
  addAssignment: (a: Assignment) => void;
  toggleAssignment: (id: string) => void;
  setTimeBlocks: (t: TimeBlock[]) => void;
  setGroupProjects: (g: GroupProject[]) => void;
  addChatMessage: (m: ChatMessage) => void;
  setPreferences: (p: Preferences) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

type PlannerContextResponse = {
  courses: Course[];
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  preferences: Preferences;
};

const apiBaseUrl =
  (import.meta.env.VITE_AI_API_BASE_URL as string | undefined) ?? "";

if (!apiBaseUrl && import.meta.env.PROD) {
  console.error(
    "[AppContext] VITE_AI_API_BASE_URL is not set. " +
      "All API calls will go to the current origin (GitHub Pages), which will return 405. " +
      "Set VITE_AI_API_BASE_URL as a GitHub repository variable pointing to your Railway backend URL.",
  );
}

async function identifyUser(email: string): Promise<string> {
  const url = `${apiBaseUrl}/api/users/identify`;
  const method = "POST";

  if (!apiBaseUrl && import.meta.env.PROD) {
    throw new Error(
      "Backend URL is not configured. VITE_AI_API_BASE_URL must be set as a GitHub repository variable. " +
        `Currently calling: ${url}`,
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
  } catch (networkError) {
    // fetch() throws TypeError for network failures, unreachable hosts, and CORS blocks.
    // The browser hides the exact reason for security, but common causes in production are:
    //   1. CORS - backend has not allowed this origin in CORS_ORIGIN env var
    //   2. Backend unreachable - Railway service is down or URL is wrong
    //   3. Mixed content - https page calling http URL
    const isNetworkError =
      networkError instanceof TypeError &&
      networkError.message.toLowerCase().includes("fetch");
    console.error("[AppContext] identifyUser network failure:", {
      url,
      method,
      error: networkError,
    });
    throw new Error(
      isNetworkError
        ? `Cannot reach backend (${url}). ` +
            "This is usually a CORS misconfiguration or the backend is unreachable. " +
            "Check that CORS_ORIGIN on Railway includes the frontend origin, and that the backend is running."
        : `Network error calling ${url}: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
    );
  }

  if (!response.ok) {
    const fallbackMessage = `Identify request failed: ${response.status} (${method} ${url})`;
    let message = fallbackMessage;

    try {
      const data = (await response.json()) as Partial<{ error: string }>;
      if (typeof data.error === "string") {
        message = `${data.error} (${method} ${url})`;
      }
    } catch {
      message = fallbackMessage;
    }

    console.error("[AppContext] identifyUser failed:", {
      url,
      method,
      status: response.status,
    });
    throw new Error(message);
  }

  const data = (await response.json()) as Partial<{ userId: string }>;

  if (typeof data.userId !== "string") {
    throw new Error("Identify response missing userId");
  }

  return data.userId;
}

async function fetchPlannerContext(
  userId: string,
): Promise<PlannerContextResponse> {
  const response = await fetch(`${apiBaseUrl}/api/planner/context`, {
    headers: {
      "x-user-id": userId,
    },
  });

  if (!response.ok) {
    throw new Error(`Planner context request failed: ${response.status}`);
  }

  return (await response.json()) as PlannerContextResponse;
}

async function persistOnboardingComplete(userId: string) {
  const response = await fetch(`${apiBaseUrl}/api/users/onboarding`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({ onboardingComplete: true }),
  });

  if (!response.ok) {
    throw new Error(`Onboarding update failed: ${response.status}`);
  }
}

function loadUserScoped<T>(key: string, userId: string, fallback: T) {
  return loadFromStorage(getUserStorageKey(key, userId), fallback);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    loadFromStorage<string | null>(STORAGE_KEYS.currentUserId, null),
  );
  const [isUserLoading, setIsUserLoading] = useState(Boolean(currentUserId));
  const [courses, setCourses] = useState<Course[]>(defaultCourses);
  const [assignments, setAssignments] =
    useState<Assignment[]>(defaultAssignments);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(defaultTimeBlocks);
  const [groupProjects, setGroupProjects] =
    useState<GroupProject[]>(defaultGroupProjects);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  const isOnboarded = preferences.onboardingComplete;

  useEffect(() => {
    let active = true;

    const hydrateForUser = async () => {
      if (!currentUserId) {
        setCourses(defaultCourses);
        setAssignments(defaultAssignments);
        setTimeBlocks(defaultTimeBlocks);
        setGroupProjects(defaultGroupProjects);
        setChatMessages([]);
        setPreferences(defaultPreferences);
        setIsUserLoading(false);
        return;
      }

      setIsUserLoading(true);

      try {
        const context = await fetchPlannerContext(currentUserId);

        if (!active) return;

        setCourses(context.courses);
        setAssignments(context.assignments);
        setTimeBlocks(context.timeBlocks);
        setPreferences(context.preferences);
        setGroupProjects(
          loadUserScoped(
            STORAGE_KEYS.groups,
            currentUserId,
            defaultGroupProjects,
          ),
        );
        setChatMessages(loadUserScoped(STORAGE_KEYS.chat, currentUserId, []));
      } catch {
        if (!active) return;

        setCourses(
          loadUserScoped(STORAGE_KEYS.courses, currentUserId, defaultCourses),
        );
        setAssignments(
          loadUserScoped(
            STORAGE_KEYS.assignments,
            currentUserId,
            defaultAssignments,
          ),
        );
        setTimeBlocks(
          loadUserScoped(
            STORAGE_KEYS.timeBlocks,
            currentUserId,
            defaultTimeBlocks,
          ),
        );
        setGroupProjects(
          loadUserScoped(
            STORAGE_KEYS.groups,
            currentUserId,
            defaultGroupProjects,
          ),
        );
        setChatMessages(loadUserScoped(STORAGE_KEYS.chat, currentUserId, []));
        setPreferences(
          loadUserScoped(
            STORAGE_KEYS.preferences,
            currentUserId,
            defaultPreferences,
          ),
        );
      } finally {
        if (active) {
          setIsUserLoading(false);
        }
      }
    };

    hydrateForUser();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.currentUserId, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    saveToStorage(
      getUserStorageKey(STORAGE_KEYS.courses, currentUserId),
      courses,
    );
  }, [courses, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    saveToStorage(
      getUserStorageKey(STORAGE_KEYS.assignments, currentUserId),
      assignments,
    );
  }, [assignments, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    saveToStorage(
      getUserStorageKey(STORAGE_KEYS.timeBlocks, currentUserId),
      timeBlocks,
    );
  }, [timeBlocks, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    saveToStorage(
      getUserStorageKey(STORAGE_KEYS.groups, currentUserId),
      groupProjects,
    );
  }, [groupProjects, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    saveToStorage(
      getUserStorageKey(STORAGE_KEYS.chat, currentUserId),
      chatMessages,
    );
  }, [chatMessages, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    saveToStorage(
      getUserStorageKey(STORAGE_KEYS.preferences, currentUserId),
      preferences,
    );
  }, [preferences, currentUserId]);

  const identifyWithEmail = async (email: string) => {
    const userId = await identifyUser(email);
    setCurrentUserId(userId);
  };

  const completeOnboarding = async () => {
    if (!currentUserId) {
      throw new Error("Cannot complete onboarding without a user");
    }

    await persistOnboardingComplete(currentUserId);
    setPreferences((prev) => ({ ...prev, onboardingComplete: true }));
  };

  const switchUser = () => {
    setCurrentUserId(null);
  };

  const addAssignment = (a: Assignment) =>
    setAssignments((prev) => [...prev, a]);
  const toggleAssignment = (id: string) =>
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a)),
    );
  const addChatMessage = (m: ChatMessage) =>
    setChatMessages((prev) => [...prev, m]);
  const resetAll = () => {
    setPreferences(defaultPreferences);
    setCourses(defaultCourses);
    setAssignments(defaultAssignments);
    setTimeBlocks(defaultTimeBlocks);
    setGroupProjects(defaultGroupProjects);
    setChatMessages([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUserId,
        isUserLoading,
        isOnboarded,
        courses,
        assignments,
        timeBlocks,
        groupProjects,
        chatMessages,
        preferences,
        identifyWithEmail,
        completeOnboarding,
        switchUser,
        setCourses,
        addAssignment,
        toggleAssignment,
        setTimeBlocks,
        setGroupProjects,
        addChatMessage,
        setPreferences,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be within AppProvider");
  return ctx;
}
