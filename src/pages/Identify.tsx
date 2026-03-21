import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Identify() {
  const { identifyWithEmail, isUserLoading } = useApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await identifyWithEmail(email);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Could not identify user. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            Welcome to shedulAI
          </h1>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email to load your personal planner workspace.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            autoComplete="email"
            placeholder="student@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isUserLoading}>
            {isUserLoading ? "Loading..." : "Continue"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
