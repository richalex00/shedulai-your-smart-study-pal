export const STORAGE_KEYS = {
  currentUserId: "schedai-current-user-id",
  onboarded: "schedai-onboarded",
  courses: "schedai-courses",
  assignments: "schedai-assignments",
  timeBlocks: "schedai-timeblocks",
  groups: "schedai-groups",
  chat: "schedai-chat",
  preferences: "schedai-prefs",
} as const;

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUserStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`;
}
