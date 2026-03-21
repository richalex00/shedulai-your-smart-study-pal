import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Sparkles, Bot, User } from "lucide-react";
import { useApp, ChatMessage } from "@/contexts/AppContext";
import { buildPlannerAiContext } from "@/features/ai/ai-context";
import { aiClient } from "@/features/ai/ai-client";

export default function Chat() {
  const {
    chatMessages,
    addChatMessage,
    assignments,
    timeBlocks,
    preferences,
    courses,
  } = useApp();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestedPrompts = aiClient.getSuggestedPrompts();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const plannerContext = buildPlannerAiContext({
      courses,
      assignments,
      timeBlocks,
      preferences,
    });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput("");
    setIsTyping(true);

    setTimeout(
      async () => {
        const aiResponse = await aiClient.respond({
          mode: "planner",
          message: text,
          context: plannerContext,
        });

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: aiResponse.content,
          timestamp: new Date().toISOString(),
        };
        addChatMessage(aiMsg);
        setIsTyping(false);
      },
      1200 + Math.random() * 800,
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-ai flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">
              shedulAI
            </h1>
            <p className="text-xs text-muted-foreground">
              Your academic assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-3 scrollbar-hide"
      >
        {chatMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold font-display text-foreground mb-1">
              Hey there! 👋
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
              I know your assignments, calendar, and preferences. Ask me
              anything!
            </p>
            <div className="grid grid-cols-2 gap-2 w-full">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-xs bg-card border border-border rounded-xl p-3 text-foreground hover:border-primary/30 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">
              📌 AI responses are simulated for this MVP
            </p>
          </motion.div>
        )}

        {chatMessages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex gap-2.5 mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse-soft" />
                <span
                  className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse-soft"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse-soft"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask shedulAI anything..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="p-2 text-primary disabled:text-muted-foreground transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
