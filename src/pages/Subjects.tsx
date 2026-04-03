import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, FileText, MessageCircle, Star } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

const courseColors: Record<string, string> = {
  study: "bg-study/10 border-study/20",
  accent: "bg-accent/10 border-accent/20",
  assignment: "bg-assignment/10 border-assignment/20",
  personal: "bg-personal/10 border-personal/20",
};

export default function Subjects() {
  const { courses, assignments, toggleCourseFavorite } = useApp();
  const navigate = useNavigate();

  const sorted = [...courses].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const favorites = sorted.filter((c) => c.isFavorite);
  const rest = sorted.filter((c) => !c.isFavorite);

  const renderCourse = (course: (typeof courses)[number], i: number) => {
    const courseAssignments = assignments.filter((a) => a.courseId === course.id);
    const pending = courseAssignments.filter((a) => !a.completed).length;
    const colorClass = courseColors[course.color] ?? "bg-card border-border";

    return (
      <motion.div
        key={course.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className={`flex items-center gap-3 rounded-2xl p-4 border text-left transition-all hover:shadow-sm ${colorClass}`}
      >
        {/* Star toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCourseFavorite(course.id);
          }}
          className="shrink-0 p-1 -m-1 text-muted-foreground hover:text-yellow-400 transition-colors"
          aria-label={course.isFavorite ? "Unfavourite" : "Favourite"}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              course.isFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none"
            }`}
          />
        </button>

        {/* Course info — tapping navigates */}
        <button
          onClick={() => navigate(`/subjects/${course.id}`)}
          className="flex-1 flex items-center gap-3 min-w-0 text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{course.name}</p>
            <p className="text-sm text-muted-foreground">{course.code}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> Materials
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> AI Chat
              </span>
              {pending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                  {pending} due
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      </motion.div>
    );
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold font-display text-foreground mb-6">
        Subjects
      </h1>

      {favorites.length > 0 && (
        <section className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Favourites
          </p>
          <div className="space-y-3">
            {favorites.map((c, i) => renderCourse(c, i))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          {favorites.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              All Courses
            </p>
          )}
          <div className="space-y-3">
            {rest.map((c, i) => renderCourse(c, favorites.length + i))}
          </div>
        </section>
      )}

      {courses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-10">
          No courses yet — connect Canvas to import yours.
        </p>
      )}
    </div>
  );
}
