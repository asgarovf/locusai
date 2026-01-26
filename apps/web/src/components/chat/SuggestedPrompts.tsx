import { FileText, Search, Sparkles, Zap } from "lucide-react";

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
};

const prompts = [
  {
    icon: Sparkles,
    title: "Create a Sprint Plan",
    description: "Based on the backlog",
    prompt:
      "Create a sprint plan for the next 2 weeks based on high priority items in the backlog.",
  },
  {
    icon: Zap,
    title: "Generate PR Description",
    description: "For the latest commit",
    prompt:
      "Draft a PR description for the recent changes in the authentication module.",
  },
  {
    icon: Search,
    title: "Explain Codebase",
    description: "How auth works?",
    prompt: "Explain how the authentication flow works in this project.",
  },
  {
    icon: FileText,
    title: "Write Documentation",
    description: "For the API endpoints",
    prompt: "Generate API documentation for the User Controller references.",
  },
];

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mx-auto p-4">
      {prompts.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(item.prompt)}
          className="flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all text-left group"
        >
          <div className="mt-0.5 shrink-0 p-2 rounded-lg bg-secondary/50 text-foreground/70 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
            <item.icon size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {item.title}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
