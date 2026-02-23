import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Course {
  id: string;
  name: string;
  code: string;
  color: 'study' | 'personal' | 'assignment' | 'accent';
}

export interface Assignment {
  id: string;
  courseId: string;
  name: string;
  deadline: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
}

export interface TimeBlock {
  id: string;
  type: 'study' | 'personal' | 'assignment';
  title: string;
  courseId?: string;
  date: string;
  startHour: number;
  endHour: number;
}

export interface GroupProject {
  id: string;
  name: string;
  courseId: string;
  members: string[];
  suggestedTimes: { id: string; label: string; votes: string[] }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface Preferences {
  studyHours: 'morning' | 'afternoon' | 'evening';
  aiMode: 'assisted' | 'automatic';
  noWorkAfter: number;
  personalActivities: boolean;
}

interface AppState {
  isOnboarded: boolean;
  courses: Course[];
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  groupProjects: GroupProject[];
  chatMessages: ChatMessage[];
  preferences: Preferences;
  setOnboarded: (v: boolean) => void;
  setCourses: (c: Course[]) => void;
  addAssignment: (a: Assignment) => void;
  toggleAssignment: (id: string) => void;
  setTimeBlocks: (t: TimeBlock[]) => void;
  setGroupProjects: (g: GroupProject[]) => void;
  addChatMessage: (m: ChatMessage) => void;
  setPreferences: (p: Preferences) => void;
  resetAll: () => void;
}

const defaultPreferences: Preferences = {
  studyHours: 'morning',
  aiMode: 'assisted',
  noWorkAfter: 21,
  personalActivities: true,
};

const defaultCourses: Course[] = [
  { id: '1', name: 'Machine Learning', code: 'CS401', color: 'study' },
  { id: '2', name: 'Data Structures', code: 'CS201', color: 'accent' },
  { id: '3', name: 'Statistics', code: 'MATH301', color: 'assignment' },
  { id: '4', name: 'Psychology', code: 'PSY101', color: 'personal' },
];

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const defaultAssignments: Assignment[] = [
  { id: 'a1', courseId: '1', name: 'Neural Network Lab Report', deadline: fmt(addDays(today, 2)), difficulty: 'hard', completed: false },
  { id: 'a2', courseId: '2', name: 'Binary Tree Implementation', deadline: fmt(addDays(today, 4)), difficulty: 'medium', completed: false },
  { id: 'a3', courseId: '3', name: 'Probability Problem Set 5', deadline: fmt(addDays(today, 1)), difficulty: 'easy', completed: true },
  { id: 'a4', courseId: '4', name: 'Research Essay Draft', deadline: fmt(addDays(today, 7)), difficulty: 'hard', completed: false },
  { id: 'a5', courseId: '1', name: 'Read Chapter 8', deadline: fmt(addDays(today, 3)), difficulty: 'easy', completed: false },
];

const defaultTimeBlocks: TimeBlock[] = [
  { id: 't1', type: 'study', title: 'ML Study Session', courseId: '1', date: fmt(today), startHour: 9, endHour: 11 },
  { id: 't2', type: 'personal', title: 'Gym 💪', date: fmt(today), startHour: 12, endHour: 13 },
  { id: 't3', type: 'assignment', title: 'Prob Set 5', courseId: '3', date: fmt(today), startHour: 14, endHour: 16 },
  { id: 't4', type: 'study', title: 'Data Structures Review', courseId: '2', date: fmt(addDays(today, 1)), startHour: 10, endHour: 12 },
  { id: 't5', type: 'personal', title: 'Free Time 🎮', date: fmt(addDays(today, 1)), startHour: 17, endHour: 19 },
  { id: 't6', type: 'study', title: 'Statistics Lecture Notes', courseId: '3', date: fmt(addDays(today, 2)), startHour: 9, endHour: 10 },
  { id: 't7', type: 'assignment', title: 'Neural Net Report', courseId: '1', date: fmt(addDays(today, 2)), startHour: 13, endHour: 16 },
];

const defaultGroupProjects: GroupProject[] = [
  {
    id: 'g1',
    name: 'ML Final Project',
    courseId: '1',
    members: ['Alex', 'Jordan', 'Sam', 'You'],
    suggestedTimes: [
      { id: 's1', label: 'Tue 3–5 PM', votes: ['Alex', 'You'] },
      { id: 's2', label: 'Wed 1–3 PM', votes: ['Jordan', 'Sam'] },
      { id: 's3', label: 'Thu 4–6 PM', votes: ['Alex', 'Jordan', 'Sam'] },
    ],
  },
];

const AppContext = createContext<AppState | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isOnboarded, setOnboarded] = useState(() => loadFromStorage('schedai-onboarded', false));
  const [courses, setCourses] = useState<Course[]>(() => loadFromStorage('schedai-courses', defaultCourses));
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadFromStorage('schedai-assignments', defaultAssignments));
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(() => loadFromStorage('schedai-timeblocks', defaultTimeBlocks));
  const [groupProjects, setGroupProjects] = useState<GroupProject[]>(() => loadFromStorage('schedai-groups', defaultGroupProjects));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => loadFromStorage('schedai-chat', []));
  const [preferences, setPreferences] = useState<Preferences>(() => loadFromStorage('schedai-prefs', defaultPreferences));

  useEffect(() => { localStorage.setItem('schedai-onboarded', JSON.stringify(isOnboarded)); }, [isOnboarded]);
  useEffect(() => { localStorage.setItem('schedai-courses', JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem('schedai-assignments', JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { localStorage.setItem('schedai-timeblocks', JSON.stringify(timeBlocks)); }, [timeBlocks]);
  useEffect(() => { localStorage.setItem('schedai-groups', JSON.stringify(groupProjects)); }, [groupProjects]);
  useEffect(() => { localStorage.setItem('schedai-chat', JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem('schedai-prefs', JSON.stringify(preferences)); }, [preferences]);

  const addAssignment = (a: Assignment) => setAssignments(prev => [...prev, a]);
  const toggleAssignment = (id: string) => setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  const addChatMessage = (m: ChatMessage) => setChatMessages(prev => [...prev, m]);
  const resetAll = () => {
    setOnboarded(false);
    setCourses(defaultCourses);
    setAssignments(defaultAssignments);
    setTimeBlocks(defaultTimeBlocks);
    setGroupProjects(defaultGroupProjects);
    setChatMessages([]);
    setPreferences(defaultPreferences);
  };

  return (
    <AppContext.Provider value={{
      isOnboarded, courses, assignments, timeBlocks, groupProjects, chatMessages, preferences,
      setOnboarded, setCourses, addAssignment, toggleAssignment, setTimeBlocks, setGroupProjects, addChatMessage, setPreferences, resetAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be within AppProvider');
  return ctx;
}
