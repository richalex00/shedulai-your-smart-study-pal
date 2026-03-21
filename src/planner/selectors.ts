import type { Assignment, Course, TimeBlock } from "@/planner/types";

export const CALENDAR_HOURS = Array.from(
  { length: 15 },
  (_, index) => index + 7,
);
export const CALENDAR_DAY_NAMES = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export function formatPlannerDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export function getTodaySchedule(timeBlocks: TimeBlock[], today = new Date()) {
  const todayKey = formatPlannerDate(today);

  return timeBlocks
    .filter((block) => block.date === todayKey)
    .sort((first, second) => first.startHour - second.startHour);
}

export function getUpcomingDeadlines(assignments: Assignment[], limit = 4) {
  return assignments
    .filter((assignment) => !assignment.completed)
    .sort(
      (first, second) =>
        new Date(first.deadline).getTime() -
        new Date(second.deadline).getTime(),
    )
    .slice(0, limit);
}

export function getUrgentAssignments(
  assignments: Assignment[],
  now = new Date(),
) {
  return assignments.filter(
    (assignment) => getDeadlineDayDifference(assignment.deadline, now) <= 1,
  );
}

export function getCourseById(courses: Course[], courseId: string) {
  return courses.find((course) => course.id === courseId);
}

export function getDeadlineDayDifference(deadline: string, now = new Date()) {
  return Math.ceil(
    (new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function getDeadlineLabel(deadline: string, now = new Date()) {
  const diff = getDeadlineDayDifference(deadline, now);

  if (diff <= 0) return "Due today";
  if (diff === 1) return "Tomorrow";

  return `${diff} days`;
}

export function isUrgentDeadline(deadline: string, now = new Date()) {
  return getDeadlineDayDifference(deadline, now) <= 1;
}

export function getGreeting(now = new Date()) {
  const hour = now.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

export function getWeekDays(weekOffset: number, today = new Date()) {
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

export function getSelectedDayBlocks(
  timeBlocks: TimeBlock[],
  selectedDay: string,
) {
  return timeBlocks
    .filter((block) => block.date === selectedDay)
    .sort((first, second) => first.startHour - second.startHour);
}

export function isTodayDate(date: Date, today = new Date()) {
  return formatPlannerDate(date) === formatPlannerDate(today);
}

export function getMonthYearLabel(weekDays: Date[]) {
  return weekDays[0].toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function hasBlocksOnDate(timeBlocks: TimeBlock[], date: string) {
  return timeBlocks.some((block) => block.date === date);
}

export function getBlockStartingAtHour(dayBlocks: TimeBlock[], hour: number) {
  return dayBlocks.find((block) => block.startHour === hour);
}

export function isHourOccupied(dayBlocks: TimeBlock[], hour: number) {
  return dayBlocks.some(
    (block) =>
      hour >= block.startHour &&
      hour < block.endHour &&
      block.startHour !== hour,
  );
}

export function isHourLocked(hour: number, noWorkAfter: number) {
  return hour >= noWorkAfter;
}
