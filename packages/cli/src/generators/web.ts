import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VERSIONS } from "../constants.js";
import type { ProjectConfig } from "../types.js";
import { ensureDir, writeJson } from "../utils.js";

export async function generateAppWeb(config: ProjectConfig) {
  const { projectPath, projectName, scopedName } = config;
  const appDir = join(projectPath, "apps/web");
  const srcDir = join(appDir, "src/app");

  await ensureDir(srcDir);
  await ensureDir(join(appDir, "src/components"));
  await ensureDir(join(appDir, "src/lib"));

  // package.json with Tailwind CSS
  await writeJson(join(appDir, "package.json"), {
    name: `${scopedName}/web`,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "next dev -p 3000",
      build: "next build",
      start: "next start",
      lint: "biome lint .",
    },
    dependencies: {
      next: VERSIONS.next,
      react: VERSIONS.react,
      "react-dom": VERSIONS.reactDom,
      "lucide-react": VERSIONS.lucide,
      "radix-ui": VERSIONS.radixUi,
      "class-variance-authority": VERSIONS.classVarianceAuthority,
      clsx: VERSIONS.clsx,
      "tailwind-merge": VERSIONS.tailwindMerge,
      "framer-motion": VERSIONS.framerMotion,
      [`${scopedName}/shared`]: "workspace:*",
    },
    devDependencies: {
      "@types/node": VERSIONS.typesNode,
      "@types/react": VERSIONS.typesReact,
      "@types/react-dom": VERSIONS.typesReactDom,
      typescript: VERSIONS.typescript,
      tailwindcss: VERSIONS.tailwindcss,
      "@tailwindcss/postcss": VERSIONS.tailwindPostcss,
      postcss: VERSIONS.postcss,
    },
  });

  await writeJson(join(appDir, "tsconfig.json"), {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      plugins: [{ name: "next" }],
      jsx: "preserve",
      lib: ["dom", "dom.iterable", "esnext"],
      module: "esnext",
      noEmit: true,
      allowJs: true,
      paths: {
        "@/*": ["./src/*"],
      },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  });

  // next.config.ts (TypeScript for ESM compatibility)
  await writeFile(
    join(appDir, "next.config.ts"),
    `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`
  );

  // postcss.config.mjs for Tailwind v4 (ESM)
  await writeFile(
    join(appDir, "postcss.config.mjs"),
    `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`
  );

  // Layout with Roboto font
  await writeFile(
    join(srcDir, "layout.tsx"),
    `import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Managed by Locus - AI-powered engineering workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
`
  );

  // Page with Next.js-style polished UI
  await writeFile(
    join(srcDir, "page.tsx"),
    `export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">${projectName}</h1>
        </div>

        <p className="text-muted-foreground text-center sm:text-left max-w-md">
          Welcome to your new project. This workspace is managed by{" "}
          <span className="font-semibold text-foreground">Locus</span> — an AI-powered
          engineering platform for agentic development.
        </p>

        <ol className="list-inside list-decimal text-sm text-center sm:text-left space-y-2">
          <li>
            Get started by editing{" "}
            <code className="bg-secondary/80 px-1.5 py-0.5 rounded font-mono text-sm">
              src/app/page.tsx
            </code>
          </li>
          <li>Save and see your changes instantly.</li>
          <li>Create tasks in Locus to let AI agents help you build.</li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-foreground/90 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js Docs
          </a>
          <a
            className="rounded-full border border-solid border-border transition-colors flex items-center justify-center hover:bg-secondary hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="http://localhost:3081"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Locus Dashboard
          </a>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-muted-foreground">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates"
          target="_blank"
          rel="noopener noreferrer"
        >
          Examples
        </a>
        <span className="text-muted-foreground/50">•</span>
        <span>Powered by Locus</span>
      </footer>
    </div>
  );
}
`
  );

  // Global CSS with Tailwind v4-style imports and Roboto font
  const globalCss = `@import "tailwindcss";

@theme {
  --font-roboto: "Roboto", sans-serif;
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-border: hsl(var(--border));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 240 100% 50%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: 0 0% 0%;
      --foreground: 0 0% 98%;
      --card: 0 0% 3%;
      --card-foreground: 0 0% 98%;
      --primary: 240 100% 50%;
      --primary-foreground: 0 0% 100%;
      --secondary: 0 0% 9%;
      --secondary-foreground: 0 0% 98%;
      --muted: 0 0% 9%;
      --muted-foreground: 0 0% 63%;
      --border: 0 0% 12%;
    }
  }

  * {
    box-sizing: border-box;
    border-color: var(--color-border);
  }

  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-roboto), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
`;
  await writeFile(join(srcDir, "globals.css"), globalCss);

  // cn utility
  await writeFile(
    join(appDir, "src/lib/utils.ts"),
    `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`
  );

  // Sample Button component with class-variance-authority
  await writeFile(
    join(appDir, "src/components/Button.tsx"),
    `import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
        secondary: "bg-gray-500 text-white hover:bg-gray-600",
        outline: "border border-border bg-background hover:bg-secondary",
        ghost: "hover:bg-secondary",
        destructive: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
`
  );

  // Sample Dialog component using Radix UI
  await writeFile(
    join(appDir, "src/components/Dialog.tsx"),
    `"use client";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-card rounded-xl border border-border p-6 shadow-2xl w-full z-50",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export function Dialog({ children, ...props }: RadixDialog.DialogProps) {
  return <RadixDialog.Root {...props}>{children}</RadixDialog.Root>;
}

export function DialogTrigger({
  children,
  ...props
}: RadixDialog.DialogTriggerProps) {
  return <RadixDialog.Trigger {...props}>{children}</RadixDialog.Trigger>;
}

interface DialogContentProps
  extends RadixDialog.DialogContentProps,
    VariantProps<typeof dialogContentVariants> {}

export function DialogContent({
  children,
  className,
  size,
  ...props
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay asChild>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
        />
      </RadixDialog.Overlay>
      <RadixDialog.Content asChild {...props}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1], // Custom easing for smooth bounce
            opacity: { duration: 0.2 },
          }}
          className={cn(dialogContentVariants({ size }), className)}
        >
          {children}
          <RadixDialog.Close className="absolute right-4 top-4 rounded-full p-1.5 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105 active:scale-95">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </RadixDialog.Close>
        </motion.div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Title
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
    >
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Description
      className={cn("text-sm text-muted-foreground", className)}
    >
      {children}
    </RadixDialog.Description>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 mt-6",
        className
      )}
    >
      {children}
    </div>
  );
}
`
  );
}
