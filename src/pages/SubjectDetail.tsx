import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Image,
  Presentation,
  Send,
  Bot,
  Lock,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { buildSubjectAiContext } from "@/features/ai/ai-context";
import { aiClient } from "@/features/ai/ai-client";

const mockMaterials = [
  {
    id: "m1",
    name: "Lecture Slides Week 7.pdf",
    type: "pdf",
    icon: Presentation,
  },
  { id: "m2", name: "Lab Instructions.pdf", type: "pdf", icon: FileText },
  { id: "m3", name: "Reference Diagram.png", type: "image", icon: Image },
];

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { courses, assignments, toggleAssignment } = useApp();
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    [],
  );

  const course = courses.find((c) => c.id === id);
  const subjectAssignments = assignments.filter((a) => a.courseId === id);

  if (!course)
    return <div className="p-6 text-muted-foreground">Subject not found</div>;

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const subjectContext = buildSubjectAiContext({
      course,
      assignments: subjectAssignments,
      materialNames: mockMaterials.map((material) => material.name),
    });
    const newMsgs = [...messages, { role: "user", text: chatInput }];
    setMessages(newMsgs);
    setChatInput("");
    setTimeout(async () => {
      const aiResponse = await aiClient.respond({
        mode: "subject",
        message: chatInput,
        context: subjectContext,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: aiResponse.content,
        },
      ]);
    }, 1000);
  };

  return (
    <div className="px-5 pt-6">
      <button
        onClick={() => navigate("/subjects")}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold font-display text-foreground">
        {course.name}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">{course.code}</p>

      {/* Materials */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Materials
        </h2>
        <div className="space-y-2">
          {mockMaterials.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
            >
              <m.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1">{m.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase">
                {m.type}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            📌 Mock materials — not real files
          </p>
        </div>
      </section>

      {/* Assignments */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Assignments
        </h2>
        <div className="space-y-2">
          {subjectAssignments.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleAssignment(a.id)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left"
            >
              {a.completed ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${a.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {a.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Due: {a.deadline} · {a.difficulty}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Subject AI Chat */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Subject AI
          </h2>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Only this subject
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 min-h-[160px] flex flex-col">
          <div className="flex-1 space-y-3 mb-3">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <Bot className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ask about {course.name} materials
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm rounded-xl px-3 py-2 whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto max-w-[85%]"
                    : "bg-muted text-foreground max-w-[85%]"
                }`}
              >
                {m.text}
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={`Ask about ${course.name}...`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="p-1.5 text-primary disabled:text-muted-foreground"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
