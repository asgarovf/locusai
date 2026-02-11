import Image from "next/image";
import Link from "next/link";

const tools = [
  {
    name: "Claude Code",
    src: "/tools/claude.png",
    href: "https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview",
  },
  {
    name: "Codex",
    src: "/tools/codex.png",
    href: "https://openai.com/index/introducing-codex/",
  },
];

export function SupportedTools() {
  return (
    <section className="py-16 border-y border-border/20 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet/[0.02] to-transparent pointer-events-none" />

      <div className="max-w-5xl px-6 mx-auto mb-8 text-center relative">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
          Works with your favorite tools
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 md:gap-24 px-6 relative">
        {tools.map((tool) => (
          <Link
            key={tool.name}
            href={tool.href}
            target="_blank"
            className="flex flex-col items-center gap-3"
          >
            <div className="relative h-10 w-28 sm:h-12 sm:w-36 md:w-44 grayscale opacity-30 hover:grayscale-0 hover:opacity-80 transition-all duration-300 cursor-pointer">
              <Image
                src={tool.src}
                alt={tool.name}
                fill
                className="object-contain"
                sizes="176px"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
