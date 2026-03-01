/**
 * Project ecosystem detection — identifies the primary language/toolchain
 * of a project by looking for well-known config files and lockfiles.
 *
 * Used to determine whether sandbox setup should run JS package install
 * or use a custom sandbox-setup.sh script instead.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

export type ProjectEcosystem =
  | "javascript"
  | "rust"
  | "go"
  | "python"
  | "java"
  | "ruby"
  | "elixir"
  | "dotnet"
  | "unknown";

interface EcosystemSignal {
  ecosystem: ProjectEcosystem;
  /** Files whose presence indicates this ecosystem. */
  markers: string[];
}

const ECOSYSTEM_SIGNALS: EcosystemSignal[] = [
  // JS/TS — package.json is the canonical marker
  {
    ecosystem: "javascript",
    markers: ["package.json"],
  },
  // Rust
  {
    ecosystem: "rust",
    markers: ["Cargo.toml"],
  },
  // Go
  {
    ecosystem: "go",
    markers: ["go.mod"],
  },
  // Python
  {
    ecosystem: "python",
    markers: [
      "pyproject.toml",
      "setup.py",
      "setup.cfg",
      "Pipfile",
      "requirements.txt",
    ],
  },
  // Java / Kotlin / JVM
  {
    ecosystem: "java",
    markers: ["pom.xml", "build.gradle", "build.gradle.kts"],
  },
  // Ruby
  {
    ecosystem: "ruby",
    markers: ["Gemfile"],
  },
  // Elixir
  {
    ecosystem: "elixir",
    markers: ["mix.exs"],
  },
  // .NET / C#
  {
    ecosystem: "dotnet",
    markers: ["*.csproj", "*.fsproj", "*.sln"],
  },
];

/**
 * Detect the primary ecosystem of a project by checking for marker files.
 * Returns the first match found (ordered by specificity).
 */
export function detectProjectEcosystem(projectRoot: string): ProjectEcosystem {
  for (const signal of ECOSYSTEM_SIGNALS) {
    for (const marker of signal.markers) {
      if (marker.startsWith("*")) {
        // Glob-style check for file extensions — just check if any file matches
        // For simplicity, skip glob patterns and rely on exact matches
        continue;
      }
      if (existsSync(join(projectRoot, marker))) {
        return signal.ecosystem;
      }
    }
  }
  return "unknown";
}

/**
 * Check whether a project ecosystem is JavaScript/TypeScript based
 * and would benefit from automatic npm/bun/yarn/pnpm install.
 */
export function isJavaScriptEcosystem(ecosystem: ProjectEcosystem): boolean {
  return ecosystem === "javascript";
}

/**
 * Generate a sandbox-setup.sh template for a given ecosystem.
 * Returns null if no template is needed (JS projects use auto-install).
 */
export function generateSandboxSetupTemplate(
  ecosystem: ProjectEcosystem
): string | null {
  switch (ecosystem) {
    case "javascript":
      return null; // Handled automatically by detectPackageManager + install

    case "rust":
      return `#!/bin/sh
# Sandbox setup for Rust projects
# This script runs inside the Docker sandbox after creation.
# Uncomment or modify the commands below for your project.

# Install Rust toolchain (if not pre-installed)
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
# . "$HOME/.cargo/env"

# Build the project
# cargo build

echo "Rust sandbox setup complete"
`;

    case "go":
      return `#!/bin/sh
# Sandbox setup for Go projects
# This script runs inside the Docker sandbox after creation.

# Download dependencies
# go mod download

# Build the project
# go build ./...

echo "Go sandbox setup complete"
`;

    case "python":
      return `#!/bin/sh
# Sandbox setup for Python projects
# This script runs inside the Docker sandbox after creation.

# Create virtual environment and install dependencies
# python3 -m venv .venv
# . .venv/bin/activate
# pip install -r requirements.txt
# OR: pip install -e .

echo "Python sandbox setup complete"
`;

    case "java":
      return `#!/bin/sh
# Sandbox setup for Java/JVM projects
# This script runs inside the Docker sandbox after creation.

# Maven
# mvn install -DskipTests

# Gradle
# ./gradlew build -x test

echo "Java sandbox setup complete"
`;

    case "ruby":
      return `#!/bin/sh
# Sandbox setup for Ruby projects
# This script runs inside the Docker sandbox after creation.

# Install dependencies
# bundle install

echo "Ruby sandbox setup complete"
`;

    case "elixir":
      return `#!/bin/sh
# Sandbox setup for Elixir projects
# This script runs inside the Docker sandbox after creation.

# Install dependencies
# mix deps.get
# mix compile

echo "Elixir sandbox setup complete"
`;

    case "dotnet":
      return `#!/bin/sh
# Sandbox setup for .NET projects
# This script runs inside the Docker sandbox after creation.

# Restore packages
# dotnet restore

# Build
# dotnet build

echo ".NET sandbox setup complete"
`;

    case "unknown":
      return `#!/bin/sh
# Sandbox setup script
# This script runs inside the Docker sandbox after creation.
# Add any commands needed to prepare the build environment.

# Example: install system dependencies
# apt-get update && apt-get install -y <packages>

# Example: install project dependencies
# <your-package-manager> install

echo "Sandbox setup complete"
`;
  }
}
