import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus,
  CalendarPlus,
  Dumbbell,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  getCourseById,
  getDeadlineLabel,
  getGreeting,
  getTodaySchedule,
  getUpcomingDeadlines,
  isUrgentDeadline,
} from "@/planner/selectors";
import { aiClient } from "@/features/ai/ai-client";
import { buildPlannerAiContext } from "@/features/ai/ai-context";

export default function Dashboard() {
  const { assignments, timeBlocks, courses, preferences, toggleAssignment, switchUser, currentUserId } =
    useApp();
  const navigate = useNavigate();
  const todayBlocks = getTodaySchedule(timeBlocks);
  const upcoming = getUpcomingDeadlines(assignments);

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;
    setAiLoading(true);

    const context = buildPlannerAiContext({ courses, assignments, timeBlocks, preferences });

    aiClient
      .respond({ mode: "planner", message: "What's my top priority today? Give me a 1-2 sentence focus recommendation.", context })
      .then((res) => {
        if (!cancelled) {
          setAiSuggestion(res.content);
          setAiLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const blockColor = (type: string) => {
    switch (type) {
      case "study":
        return "bg-study/10 border-study/30 text-study";
      case "personal":
        return "bg-personal/10 border-personal/30 text-personal";
      case "assignment":
        return "bg-assignment/10 border-assignment/30 text-assignment";
      default:
        return "bg-muted border-border text-foreground";
    }
  };

  const greeting = getGreeting();

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between gap-3"
      >
        <div>
          <p className="text-muted-foreground text-sm">{greeting} 👋</p>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Your Day
          </h1>
        </div>
        <button
          type="button"
          onClick={switchUser}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Switch user
        </button>
      </motion.div>

      {/* AI Suggestion Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-primary/10 via-ai/5 to-accent/10 rounded-2xl p-5 mb-6 border border-primary/15"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            AI Suggestion
          </span>
        </div>
        {aiLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3.5 bg-primary/10 rounded-full w-full" />
            <div className="h-3.5 bg-primary/10 rounded-full w-4/5" />
          </div>
        ) : aiSuggestion ? (
          <p className="text-foreground font-medium text-sm leading-relaxed whitespace-pre-line">
            {aiSuggestion}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Couldn't load suggestion — check your connection.
          </p>
        )}
        <button
          onClick={() => navigate("/chat")}
          className="mt-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI for more →
        </button>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-3 mb-6"
      >
        {[
          {
            icon: Sparkles,
            label: "Ask AI",
            action: () => navigate("/chat"),
            accent: true,
          },
          { icon: Plus, label: "Assignment", action: () => {} },
          { icon: Dumbbell, label: "Activity", action: () => {} },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
              btn.accent
                ? "bg-primary/5 border-primary/20 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <btn.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{btn.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Today's Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold font-display text-foreground">
            Today's Schedule
          </h2>
          <button
            onClick={() => navigate("/calendar")}
            className="text-xs text-primary font-medium"
          >
            View all →
          </button>
        </div>

        {todayBlocks.length === 0 ? (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <CalendarPlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No blocks scheduled for today
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBlocks.map((block) => (
              <div
                key={block.id}
                className={`flex items-center gap-3 rounded-xl p-3.5 border ${blockColor(block.type)}`}
              >
                <div className="flex flex-col items-center min-w-[48px]">
                  <span className="text-xs font-semibold">
                    {block.startHour}:00
                  </span>
                  <div className="w-px h-3 bg-current opacity-30" />
                  <span className="text-xs">{block.endHour}:00</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">
                    {block.title}
                  </p>
                  {block.courseId && (
                    <p className="text-xs text-muted-foreground">
                      {getCourseById(courses, block.courseId)?.name}
                    </p>
                  )}
                </div>
                {block.type === "study" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-study/20 text-study font-medium">
                    AI
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Upcoming Deadlines */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold font-display text-foreground mb-3">
          Upcoming Deadlines
        </h2>
        <div className="space-y-2">
          {upcoming.map((a) => {
            const days = getDeadlineLabel(a.deadline);
            const urgent = isUrgentDeadline(a.deadline);
            return (
              <button
                key={a.id}
                onClick={() => toggleAssignment(a.id)}
                className="w-full flex items-center gap-3 bg-card rounded-xl p-3.5 border border-border text-left transition-all hover:border-primary/20"
              >
                {a.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-sm truncate ${a.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {a.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getCourseById(courses, a.courseId)?.name}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium shrink-0 ${urgent ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {urgent && <AlertTriangle className="w-3 h-3" />}
                  <Clock className="w-3 h-3" />
                  {days}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
