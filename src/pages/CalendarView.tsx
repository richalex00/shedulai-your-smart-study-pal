import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  CALENDAR_DAY_NAMES,
  CALENDAR_HOURS,
  formatPlannerDate,
  getBlockStartingAtHour,
  getMonthYearLabel,
  getSelectedDayBlocks,
  getWeekDays,
  hasBlocksOnDate,
  isHourLocked,
  isHourOccupied,
  isTodayDate,
} from "@/planner/selectors";

export default function CalendarView() {
  const { timeBlocks, preferences } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const [selectedDay, setSelectedDay] = useState(() => {
    return formatPlannerDate(new Date());
  });

  const dayBlocks = getSelectedDayBlocks(timeBlocks, selectedDay);
  const monthYear = getMonthYearLabel(weekDays);

  const blockStyle = (type: string) => {
    switch (type) {
      case "study":
        return "bg-study text-study-foreground";
      case "personal":
        return "bg-personal text-personal-foreground";
      case "assignment":
        return "bg-assignment text-assignment-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display text-foreground">
          Calendar
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <span className="text-sm font-medium text-muted-foreground min-w-[120px] text-center">
            {monthYear}
          </span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="flex gap-1 mb-6">
        {weekDays.map((d, i) => {
          const key = formatPlannerDate(d);
          const active = key === selectedDay;
          const hasBlocks = hasBlocksOnDate(timeBlocks, key);
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${
                active
                  ? "bg-primary text-primary-foreground"
                  : isTodayDate(d)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-[10px] font-medium opacity-70">
                {CALENDAR_DAY_NAMES[i]}
              </span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
              {hasBlocks && !active && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {[
          { label: "Study", cls: "bg-study" },
          { label: "Assignment", cls: "bg-assignment" },
          { label: "Personal", cls: "bg-personal" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.cls}`} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="relative">
        {CALENDAR_HOURS.map((h) => {
          const block = getBlockStartingAtHour(dayBlocks, h);
          const isLocked = isHourLocked(h, preferences.noWorkAfter);
          const isOccupied = isHourOccupied(dayBlocks, h);

          if (isOccupied) return null;

          return (
            <div key={h} className="flex gap-3 min-h-[48px]">
              <span className="text-[11px] text-muted-foreground w-12 pt-1 text-right shrink-0">
                {h > 12 ? h - 12 : h}
                {h >= 12 ? "PM" : "AM"}
              </span>
              <div className="flex-1 border-t border-border relative">
                {block ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-xl p-3 mb-1 ${blockStyle(block.type)}`}
                    style={{
                      minHeight: `${(block.endHour - block.startHour) * 48}px`,
                    }}
                  >
                    <p className="font-semibold text-sm">{block.title}</p>
                    <p className="text-xs opacity-80">
                      {block.startHour}:00 – {block.endHour}:00
                    </p>
                    {block.type === "study" && (
                      <span className="inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded-md bg-white/20 font-medium">
                        AI Generated
                      </span>
                    )}
                  </motion.div>
                ) : isLocked ? (
                  <div className="flex items-center gap-1.5 py-3 px-2 opacity-40">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      No work zone
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
