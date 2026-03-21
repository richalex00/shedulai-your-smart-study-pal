import type {
  PlannerAiContext,
  SubjectAiContext,
} from "@/features/ai/ai-context";

export const suggestedPrompts = [
  "What should I work on today?",
  "Plan my study week",
  "Find 3 gym time slots",
  "Help me with my ML assignment",
];

const globalAiResponses: Record<string, string> = {
  default:
    "I've analyzed your schedule and assignments. Here's what I suggest:\n\n**Priority:** Your Neural Network Lab Report is due soon and it's marked as hard. I'd recommend dedicating 2-3 focused hours today.\n\n**Study tip:** Since you prefer morning study sessions, I've blocked 9-11 AM for deep work tomorrow.\n\n💡 *This suggestion is based on your simulated data. In the full version, I'd sync with your actual course materials.*",
  "what should i work on today":
    "Based on your current workload, here's your priority for today:\n\n1. 🔴 **Probability Problem Set 5** — due tomorrow, but it's easy difficulty. Quick win!\n2. 🟡 **Neural Network Lab Report** — due in 2 days, hard difficulty. Start the outline today.\n3. 🟢 **Read Chapter 8** — low priority, save for evening.\n\nI've kept your afternoon free for the gym 💪\n\n*Remember: No work after 9 PM — that's your rule!*",
  "plan my study week":
    "Here's your AI-optimized study week:\n\n📅 **Monday:** ML Study (9-11 AM) → Gym (12-1 PM) → Prob Set (2-4 PM)\n📅 **Tuesday:** Data Structures Review (10-12 PM) → Free time (5-7 PM)\n📅 **Wednesday:** Stats Lecture Notes (9-10 AM) → Neural Net Report (1-4 PM)\n📅 **Thursday:** Psychology Essay Draft (9-12 PM) → Group Project Meeting (4-6 PM)\n📅 **Friday:** Light review + catch-up buffer\n\n⚡ I balanced your hard tasks across the week and kept evenings free.\n\n*Shall I lock this schedule in?*",
  "find 3 gym time slots":
    "I found 3 great gym slots that don't conflict with your study schedule:\n\n1. 🏋️ **Today 12:00 – 1:00 PM** (already scheduled!)\n2. 🏋️ **Wednesday 11:00 AM – 12:00 PM** (between study blocks)\n3. 🏋️ **Friday 3:00 – 4:00 PM** (light day, great energy boost)\n\nThese slots avoid your peak focus hours and give you good breaks between study sessions.\n\n*Want me to add these to your calendar?*",
};

const subjectAiResponses = [
  "Based on this subject's materials, I'd recommend reviewing the lecture slides from Week 7 first — they cover the key concepts for your upcoming assignment.\n\n⚠️ *I only have access to materials uploaded for this specific subject.*",
  "Looking at your assignments, the Lab Report is your priority. Here's a suggested outline based on the lecture materials:\n\n1. **Introduction** — Problem statement\n2. **Methodology** — Your approach\n3. **Results** — Key findings\n4. **Discussion** — Analysis\n\n📌 *Simulated response based on mock data*",
];

export function getMockGlobalAiResponse(
  input: string,
  _context: PlannerAiContext,
): string {
  const lowerInput = input.toLowerCase().trim();

  for (const [key, value] of Object.entries(globalAiResponses)) {
    if (key !== "default" && lowerInput.includes(key)) {
      return value;
    }
  }

  return globalAiResponses.default;
}

export function getMockSubjectAiResponse(
  _input: string,
  _context: SubjectAiContext,
): string {
  return subjectAiResponses[
    Math.floor(Math.random() * subjectAiResponses.length)
  ];
}
