import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, MessageCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const courseEmojis: Record<string, string> = {
  '1': '🤖', '2': '🌲', '3': '📊', '4': '🧠',
};

const courseColors: Record<string, string> = {
  '1': 'bg-study/10 border-study/20',
  '2': 'bg-accent/10 border-accent/20',
  '3': 'bg-assignment/10 border-assignment/20',
  '4': 'bg-personal/10 border-personal/20',
};

export default function Subjects() {
  const { courses, assignments } = useApp();
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold font-display text-foreground mb-6">Subjects</h1>

      <div className="space-y-3">
        {courses.map((course, i) => {
          const courseAssignments = assignments.filter(a => a.courseId === course.id);
          const pending = courseAssignments.filter(a => !a.completed).length;
          return (
            <motion.button
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/subjects/${course.id}`)}
              className={`w-full flex items-center gap-4 rounded-2xl p-4 border text-left transition-all hover:shadow-sm ${courseColors[course.id] || 'bg-card border-border'}`}
            >
              <span className="text-3xl">{courseEmojis[course.id] || '📚'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{course.name}</p>
                <p className="text-sm text-muted-foreground">{course.code}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 3 materials</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> AI Chat</span>
                  {pending > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                      {pending} due
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
