import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Megaphone,
  BookOpen,
  Send,
  Bot,
  Lock,
  CheckCircle2,
  Circle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { aiClient } from "@/features/ai/ai-client";
import { buildSubjectAiContext } from "@/features/ai/ai-context";

interface CourseMaterial {
  id: string;
  name: string;
  type: "file" | "announcement" | "page";
  mimeType?: string | null;
}

const apiBaseUrl =
  (import.meta.env.VITE_AI_API_BASE_URL as string | undefined) ?? "";

async function fetchMaterials(
  courseId: string,
  userId: string,
): Promise<CourseMaterial[]> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/courses/${courseId}/materials`, {
      headers: { "x-user-id": userId },
    });
    if (!res.ok) return [];
    return (await res.json()) as CourseMaterial[];
  } catch {
    return [];
  }
}

async function syncMaterials(
  courseId: string,
  userId: string,
): Promise<{ synced: number; skipped: number }> {
  const res = await fetch(
    `${apiBaseUrl}/api/canvas/sync-materials/${courseId}`,
    { method: "POST", headers: { "x-user-id": userId } },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Sync failed");
  }
  return res.json() as Promise<{ synced: number; skipped: number }>;
}

const materialIcon = (type: string) => {
  if (type === "announcement") return Megaphone;
  if (type === "page") return BookOpen;
  return FileText;
};

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { courses, assignments, toggleAssignment, currentUserId } = useApp();
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const course = courses.find((c) => c.id === id);
  const subjectAssignments = assignments.filter((a) => a.courseId === id);

  if (!course) {
    return <div className="p-6 text-muted-foreground">Subject not found</div>;
  }

  // Load materials on first render
  if (!materialsLoaded && currentUserId && id) {
    setMaterialsLoaded(true);
    fetchMaterials(id, currentUserId).then(setMaterials);
  }

  const handleSync = async () => {
    if (!currentUserId || !id) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncMaterials(id, currentUserId);
      setSyncResult(`Synced ${result.synced} items`);
      const fresh = await fetchMaterials(id, currentUserId);
      setMaterials(fresh);
    } catch (err) {
      setSyncResult(
        err instanceof Error ? err.message : "Sync failed",
      );
    } finally {
      setSyncing(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const text = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatLoading(true);

    try {
      const subjectContext = buildSubjectAiContext({
        course,
        assignments: subjectAssignments,
        materialNames: materials.map((m) => m.name),
      });
      const res = await aiClient.respond({
        mode: "subject",
        message: text,
        context: subjectContext,
      });
      setMessages((prev) => [...prev, { role: "ai", text: res.content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I couldn't get a response. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const announcementCount = materials.filter((m) => m.type === "announcement").length;
  const fileCount = materials.filter((m) => m.type === "file").length;
  const pageCount = materials.filter((m) => m.type === "page").length;

  return (
    <div className="px-5 pt-6 pb-8">
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Materials
          </h2>
          <button
            onClick={() => void handleSync()}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium text-primary disabled:text-muted-foreground transition-colors"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {syncing ? "Syncing…" : "Sync from Canvas"}
          </button>
        </div>

        {syncResult && (
          <p className="text-xs text-muted-foreground mb-2">{syncResult}</p>
        )}

        {materials.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No materials yet — tap "Sync from Canvas" to import.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-3 text-xs text-muted-foreground">
              {announcementCount > 0 && <span>{announcementCount} announcements</span>}
              {pageCount > 0 && <span>{pageCount} pages</span>}
              {fileCount > 0 && <span>{fileCount} files</span>}
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {materials.map((m) => {
                const Icon = materialIcon(m.type);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                      {m.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Assignments */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Assignments
        </h2>
        {subjectAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments for this course.</p>
        ) : (
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
                    Due: {a.deadline}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Subject AI Chat */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Subject AI
          </h2>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Only this course
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col" style={{ minHeight: 200 }}>
          <div className="flex-1 space-y-3 mb-3">
            {messages.length === 0 && !chatLoading && (
              <div className="text-center py-4">
                <Bot className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ask anything about {course.name}
                </p>
                {materials.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    AI has access to {materials.length} synced materials
                  </p>
                )}
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
            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !chatLoading && void sendChat()}
              placeholder={`Ask about ${course.name}…`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => void sendChat()}
              disabled={!chatInput.trim() || chatLoading}
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
