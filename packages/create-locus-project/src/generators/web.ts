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

  await writeJson(join(appDir, "package.json"), {
    name: `${scopedName}/web`,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "next dev -p 3000",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      next: VERSIONS.next,
      react: VERSIONS.react,
      "react-dom": VERSIONS.reactDom,
      "lucide-react": VERSIONS.lucide,
      [`${scopedName}/shared`]: "workspace:*",
    },
    devDependencies: {
      "@types/node": VERSIONS.typesNode,
      "@types/react": VERSIONS.typesReact,
      "@types/react-dom": VERSIONS.typesReactDom,
      typescript: VERSIONS.typescript,
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
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  });

  await writeFile(
    join(appDir, "next.config.js"),
    "/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n"
  );

  await writeFile(
    join(srcDir, "layout.tsx"),
    `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Managed by Locus",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
  );

  await writeFile(
    join(srcDir, "page.tsx"),
    `export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome to ${projectName}</h1>
      <p>Frontend running on port 3000</p>
    </main>
  );
}
`
  );

  await writeFile(
    join(srcDir, "globals.css"),
    "body { margin: 0; font-family: sans-serif; }\n"
  );
}
