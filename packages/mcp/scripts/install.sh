#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Locus Claude Code Plugin Installer
#
# Installs Locus as a Claude Code plugin with:
#   1. MCP server — exposes Locus tools, resources, and prompts
#   2. Skills    — adds /locus slash commands
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/asgarovf/locusai/main/packages/mcp/scripts/install.sh | bash
#   # or
#   ./install.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="https://github.com/asgarovf/locusai.git"
CLAUDE_DIR="${HOME}/.claude"
SKILLS_DIR="${CLAUDE_DIR}/skills"
TMP_DIR=""

# Colors (if terminal supports them)
if [ -t 1 ]; then
  BOLD="\033[1m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  CYAN="\033[36m"
  DIM="\033[2m"
  RESET="\033[0m"
else
  BOLD="" GREEN="" YELLOW="" CYAN="" DIM="" RESET=""
fi

info()  { printf "${CYAN}●${RESET} %s\n" "$1"; }
ok()    { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn()  { printf "${YELLOW}⚠${RESET} %s\n" "$1"; }
fail()  { printf "\033[31m✗ %s${RESET}\n" "$1" >&2; exit 1; }

cleanup() {
  [ -n "${TMP_DIR}" ] && [ -d "${TMP_DIR}" ] && rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

# ─── Preflight ───────────────────────────────────────────────────────────────

main() {
  printf "\n${BOLD}Locus — Claude Code Plugin Installer${RESET}\n\n"

  # Check prerequisites
  command -v git >/dev/null 2>&1 || fail "git is required but not installed"
  command -v node >/dev/null 2>&1 || fail "node is required (v18+). Install from https://nodejs.org"

  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "${NODE_VERSION}" -lt 18 ]; then
    fail "Node.js 18+ required (found v${NODE_VERSION})"
  fi

  # Check if claude CLI is available
  if command -v claude >/dev/null 2>&1; then
    ok "Claude Code CLI found"
  else
    warn "Claude Code CLI not found — skills will be installed but MCP setup will be manual"
  fi

  # ─── Download ──────────────────────────────────────────────────────────────

  info "Downloading Locus..."
  TMP_DIR=$(mktemp -d)
  git clone --depth 1 "${REPO_URL}" "${TMP_DIR}/locusai" 2>/dev/null
  ok "Downloaded"

  SRC="${TMP_DIR}/locusai/packages/mcp"

  # ─── Install Skills ────────────────────────────────────────────────────────

  info "Installing skills to ${SKILLS_DIR}/"

  mkdir -p "${SKILLS_DIR}"

  # Copy each skill directory
  for skill_dir in "${SRC}/skills"/*/; do
    skill_name=$(basename "${skill_dir}")
    mkdir -p "${SKILLS_DIR}/${skill_name}"
    cp -r "${skill_dir}"* "${SKILLS_DIR}/${skill_name}/"
  done

  SKILL_COUNT=$(find "${SRC}/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
  ok "Installed ${SKILL_COUNT} skills"

  # ─── Install MCP Server ────────────────────────────────────────────────────

  info "Setting up MCP server..."

  MCP_BIN="${SRC}/bin/locus-mcp.js"

  if [ -f "${MCP_BIN}" ]; then
    # Copy the pre-built MCP server binary
    MCP_INSTALL_DIR="${CLAUDE_DIR}/mcp/locus"
    mkdir -p "${MCP_INSTALL_DIR}"
    cp "${MCP_BIN}" "${MCP_INSTALL_DIR}/locus-mcp.js"
    chmod +x "${MCP_INSTALL_DIR}/locus-mcp.js"

    # Register with Claude Code if CLI is available
    if command -v claude >/dev/null 2>&1; then
      claude mcp add locus --transport stdio -- node "${MCP_INSTALL_DIR}/locus-mcp.js" 2>/dev/null && \
        ok "MCP server registered with Claude Code" || \
        warn "Could not auto-register MCP server. Add manually with:\n    claude mcp add locus -- node ${MCP_INSTALL_DIR}/locus-mcp.js"
    else
      ok "MCP server installed to ${MCP_INSTALL_DIR}/locus-mcp.js"
      printf "  ${DIM}Register manually: claude mcp add locus -- node ${MCP_INSTALL_DIR}/locus-mcp.js${RESET}\n"
    fi
  else
    warn "Pre-built MCP server not found. Build from source:"
    printf "  ${DIM}cd packages/mcp && bun install && bun run build${RESET}\n"
  fi

  # ─── Install Locus CLI (if not already installed) ──────────────────────────

  if command -v locus >/dev/null 2>&1; then
    ok "Locus CLI already installed ($(locus --version 2>/dev/null || echo 'unknown version'))"
  else
    info "Locus CLI not found — installing globally..."
    if command -v npm >/dev/null 2>&1; then
      npm install -g @locusai/cli 2>/dev/null && \
        ok "Locus CLI installed" || \
        warn "Could not install Locus CLI globally. Install manually: npm install -g @locusai/cli"
    elif command -v bun >/dev/null 2>&1; then
      bun install -g @locusai/cli 2>/dev/null && \
        ok "Locus CLI installed" || \
        warn "Could not install Locus CLI globally. Install manually: bun add -g @locusai/cli"
    else
      warn "Install Locus CLI manually: npm install -g @locusai/cli"
    fi
  fi

  # ─── Done ──────────────────────────────────────────────────────────────────

  printf "\n${GREEN}${BOLD}Installation complete!${RESET}\n\n"
  printf "  ${BOLD}Usage:${RESET}\n"
  printf "    1. Start Claude Code:  ${CYAN}claude${RESET}\n"
  printf "    2. Use slash commands:  ${CYAN}/locus status${RESET}\n"
  printf "    3. Plan a sprint:      ${CYAN}/locus plan \"build user auth\"${RESET}\n"
  printf "    4. Run issues:         ${CYAN}/locus run 1 2 3${RESET}\n"
  printf "    5. Review PRs:         ${CYAN}/locus review${RESET}\n\n"
  printf "  ${BOLD}MCP tools${RESET} are also available directly in Claude Code\n"
  printf "  (e.g., ask Claude to \"show project status\" and it will call locus_status).\n\n"
  printf "  ${DIM}Documentation: https://github.com/asgarovf/locusai${RESET}\n\n"
}

main
