import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Check, Sparkles, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function GroupProjects() {
  const { groupProjects, courses } = useApp();
  const [userVotes, setUserVotes] = useState<Record<string, string[]>>({});

  const toggleVote = (projectId: string, timeId: string) => {
    setUserVotes(prev => {
      const current = prev[projectId] || [];
      if (current.includes(timeId)) {
        return { ...prev, [projectId]: current.filter(id => id !== timeId) };
      }
      return { ...prev, [projectId]: [...current, timeId] };
    });
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold font-display text-foreground mb-2">Group Projects</h1>
      <p className="text-sm text-muted-foreground mb-6">Coordinate with your team</p>

      {groupProjects.map((project, pi) => {
        const course = courses.find(c => c.id === project.courseId);
        const votes = userVotes[project.id] || [];

        return (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pi * 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{project.name}</h2>
                <p className="text-xs text-muted-foreground">{course?.name} · {course?.code}</p>
              </div>
            </div>

            {/* Members */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {project.members.map(m => (
                <span key={m} className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  m === 'You' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {m}
                </span>
              ))}
            </div>

            {/* AI Suggestion Banner */}
            <div className="flex items-center gap-2 bg-ai/5 border border-ai/15 rounded-xl p-3 mb-4">
              <Sparkles className="w-4 h-4 text-ai shrink-0" />
              <p className="text-xs text-foreground">
                AI analyzed everyone's availability and suggests <strong>3 meeting times</strong>
              </p>
            </div>

            {/* Time Voting */}
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" /> Vote for a time
            </h3>
            <div className="space-y-2">
              {project.suggestedTimes.map(time => {
                const totalVotes = time.votes.length + (votes.includes(time.id) ? 1 : 0);
                const isVoted = votes.includes(time.id);
                const maxVotes = project.members.length;

                return (
                  <button
                    key={time.id}
                    onClick={() => toggleVote(project.id, time.id)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 border-2 transition-all ${
                      isVoted ? 'border-primary bg-primary/5' : 'border-border bg-background'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isVoted ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {isVoted && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-foreground">{time.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={false}
                          animate={{ width: `${(totalVotes / maxVotes) * 100}%` }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{totalVotes}/{maxVotes}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-3">
              📌 Simulated availability — no real syncing
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
