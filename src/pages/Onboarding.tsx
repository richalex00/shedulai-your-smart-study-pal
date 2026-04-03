import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Sparkles,
  BookOpen,
  Clock,
  Dumbbell,
  Zap,
  Link,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import onboardingHero from "@/assets/onboarding-hero.png";

const steps = [
  {
    title: "Welcome to shedulAI",
    subtitle: "Your AI that plans your studies and your life",
    icon: Sparkles,
  },
  {
    title: "Your Courses",
    subtitle: "We've pre-loaded some sample courses for you to explore",
    icon: BookOpen,
  },
  {
    title: "Study Preferences",
    subtitle: "When do you focus best?",
    icon: Clock,
  },
  {
    title: "AI Scheduling",
    subtitle: "How should your AI assistant help you?",
    icon: Zap,
  },
  {
    title: "Connect Canvas",
    subtitle: "Import your real courses and assignments automatically",
    icon: Link,
  },
];

const CANVAS_BASE_URL = "https://canvas.utwente.nl";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { completeOnboarding, connectCanvas, preferences, setPreferences } =
    useApp();
  const navigate = useNavigate();

  // Canvas step state
  const [canvasToken, setCanvasToken] = useState("");
  const [canvasConnecting, setCanvasConnecting] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [canvasConnected, setCanvasConnected] = useState(false);

  const finish = async () => {
    await completeOnboarding();
    navigate("/dashboard");
  };

  const handleCanvasConnect = async () => {
    if (!canvasToken.trim()) return;
    setCanvasConnecting(true);
    setCanvasError(null);
    try {
      await connectCanvas(CANVAS_BASE_URL, canvasToken.trim());
      setCanvasConnected(true);
    } catch (err) {
      setCanvasError(
        err instanceof Error ? err.message : "Connection failed. Check your token and try again.",
      );
    } finally {
      setCanvasConnecting(false);
    }
  };

  const next = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      await finish();
    }
  };

  const isLastStep = step === steps.length - 1;
  const canAdvance = !isLastStep || canvasConnected;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Progress */}
      <div className="flex gap-2 px-6 pt-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col px-6 pt-8"
        >
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <img
                src={onboardingHero}
                alt="Student studying"
                className="w-56 h-56 mb-8 rounded-3xl"
              />
              <h1 className="text-3xl font-bold font-display text-foreground mb-3">
                {steps[0].title}
              </h1>
              <p className="text-muted-foreground text-lg mb-2">
                {steps[0].subtitle}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Organize assignments, plan study time, and balance your life —
                powered by AI.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                {steps[1].title}
              </h2>
              <p className="text-muted-foreground mb-6">{steps[1].subtitle}</p>
              <div className="space-y-3">
                {[
                  { name: "Machine Learning", code: "CS401", emoji: "🤖" },
                  { name: "Data Structures", code: "CS201", emoji: "🌲" },
                  { name: "Statistics", code: "MATH301", emoji: "📊" },
                  { name: "Psychology", code: "PSY101", emoji: "🧠" },
                ].map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border"
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.code}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                📌 You'll replace these with your real Canvas courses in the next step
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                {steps[2].title}
              </h2>
              <p className="text-muted-foreground mb-6">{steps[2].subtitle}</p>
              <div className="space-y-3">
                {(["morning", "afternoon", "evening"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setPreferences({ ...preferences, studyHours: t })
                    }
                    className={`w-full flex items-center gap-4 rounded-xl p-4 border-2 transition-all ${
                      preferences.studyHours === t
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">
                      {t === "morning" ? "🌅" : t === "afternoon" ? "☀️" : "🌙"}
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-foreground capitalize">
                        {t}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t === "morning"
                          ? "6 AM – 12 PM"
                          : t === "afternoon"
                            ? "12 PM – 6 PM"
                            : "6 PM – 11 PM"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <label className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
                  <Dumbbell className="w-5 h-5 text-personal" />
                  <span className="flex-1 text-foreground font-medium">
                    Include personal activities
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.personalActivities}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        personalActivities: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded accent-primary"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                {steps[3].title}
              </h2>
              <p className="text-muted-foreground mb-6">{steps[3].subtitle}</p>
              <div className="space-y-3">
                {[
                  {
                    mode: "assisted" as const,
                    title: "Assisted",
                    desc: "AI suggests, you decide",
                    icon: "🤝",
                  },
                  {
                    mode: "automatic" as const,
                    title: "Automatic",
                    desc: "AI schedules for you",
                    icon: "🚀",
                  },
                ].map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() =>
                      setPreferences({ ...preferences, aiMode: opt.mode })
                    }
                    className={`w-full flex items-center gap-4 rounded-xl p-4 border-2 transition-all ${
                      preferences.aiMode === opt.mode
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">
                        {opt.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-8 bg-ai/10 rounded-xl p-4 border border-ai/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-ai" />
                  <span className="text-sm font-semibold text-foreground">
                    AI Preview
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  "Based on your preferences, I'll schedule morning study blocks
                  and keep evenings free. Let's get started! 🎯"
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                {steps[4].title}
              </h2>
              <p className="text-muted-foreground mb-6">{steps[4].subtitle}</p>

              {canvasConnected ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                  <p className="text-lg font-semibold text-foreground">
                    Canvas connected!
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Your courses and upcoming assignments have been imported.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 rounded-xl p-4 border border-border mb-5">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      How to get your Canvas token:
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Open Canvas → Account → Settings</li>
                      <li>Scroll to "Approved Integrations"</li>
                      <li>Click "New Access Token"</li>
                      <li>Copy the token and paste it below</li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Canvas Instance
                      </label>
                      <div className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                        {CANVAS_BASE_URL}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Personal Access Token
                      </label>
                      <input
                        type="password"
                        value={canvasToken}
                        onChange={(e) => {
                          setCanvasToken(e.target.value);
                          setCanvasError(null);
                        }}
                        placeholder="Paste your Canvas token here"
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {canvasError && (
                      <p className="text-sm text-destructive">{canvasError}</p>
                    )}

                    <Button
                      onClick={() => void handleCanvasConnect()}
                      disabled={!canvasToken.trim() || canvasConnecting}
                      className="w-full h-12 rounded-xl"
                    >
                      {canvasConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        "Connect Canvas"
                      )}
                    </Button>
                  </div>

                  <button
                    onClick={() => void finish()}
                    className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
                  >
                    Skip for now
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom CTA — hidden on Canvas step (it has its own buttons) */}
      {step < 4 && (
        <div className="px-6 pb-8 pt-4">
          <Button
            onClick={() => void next()}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Continue
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-full text-center text-sm text-muted-foreground mt-3"
            >
              Back
            </button>
          )}
        </div>
      )}

      {/* Canvas step: show Continue only after connected */}
      {step === 4 && canvasConnected && (
        <div className="px-6 pb-8 pt-4">
          <Button
            onClick={() => void finish()}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Let's go!
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
