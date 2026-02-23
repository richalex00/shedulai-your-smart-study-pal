import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, Sparkles, Bot, User } from 'lucide-react';
import { useApp, ChatMessage } from '@/contexts/AppContext';

const suggestedPrompts = [
  "What should I work on today?",
  "Plan my study week",
  "Find 3 gym time slots",
  "Help me with my ML assignment",
];

const aiResponses: Record<string, string> = {
  default: "I've analyzed your schedule and assignments. Here's what I suggest:\n\n**Priority:** Your Neural Network Lab Report is due soon and it's marked as hard. I'd recommend dedicating 2-3 focused hours today.\n\n**Study tip:** Since you prefer morning study sessions, I've blocked 9-11 AM for deep work tomorrow.\n\n💡 *This suggestion is based on your simulated data. In the full version, I'd sync with your actual course materials.*",
  "what should i work on today": "Based on your current workload, here's your priority for today:\n\n1. 🔴 **Probability Problem Set 5** — due tomorrow, but it's easy difficulty. Quick win!\n2. 🟡 **Neural Network Lab Report** — due in 2 days, hard difficulty. Start the outline today.\n3. 🟢 **Read Chapter 8** — low priority, save for evening.\n\nI've kept your afternoon free for the gym 💪\n\n*Remember: No work after 9 PM — that's your rule!*",
  "plan my study week": "Here's your AI-optimized study week:\n\n📅 **Monday:** ML Study (9-11 AM) → Gym (12-1 PM) → Prob Set (2-4 PM)\n📅 **Tuesday:** Data Structures Review (10-12 PM) → Free time (5-7 PM)\n📅 **Wednesday:** Stats Lecture Notes (9-10 AM) → Neural Net Report (1-4 PM)\n📅 **Thursday:** Psychology Essay Draft (9-12 PM) → Group Project Meeting (4-6 PM)\n📅 **Friday:** Light review + catch-up buffer\n\n⚡ I balanced your hard tasks across the week and kept evenings free.\n\n*Shall I lock this schedule in?*",
  "find 3 gym time slots": "I found 3 great gym slots that don't conflict with your study schedule:\n\n1. 🏋️ **Today 12:00 – 1:00 PM** (already scheduled!)\n2. 🏋️ **Wednesday 11:00 AM – 12:00 PM** (between study blocks)\n3. 🏋️ **Friday 3:00 – 4:00 PM** (light day, great energy boost)\n\nThese slots avoid your peak focus hours and give you good breaks between study sessions.\n\n*Want me to add these to your calendar?*",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const [key, value] of Object.entries(aiResponses)) {
    if (key !== 'default' && lower.includes(key)) return value;
  }
  return aiResponses.default;
}

export default function Chat() {
  const { chatMessages, addChatMessage } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: getAIResponse(text),
        timestamp: new Date().toISOString(),
      };
      addChatMessage(aiMsg);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
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
            <h1 className="text-lg font-bold font-display text-foreground">shedulAI</h1>
            <p className="text-xs text-muted-foreground">Your academic assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3 scrollbar-hide">
        {chatMessages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold font-display text-foreground mb-1">Hey there! 👋</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
              I know your assignments, calendar, and preferences. Ask me anything!
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
            className={`flex gap-2.5 mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-card border border-border text-foreground rounded-bl-md'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
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
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
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
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
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
