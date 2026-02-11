#!/usr/bin/env bash
#
# Locus Development Environment Setup
# Provisions a fresh Ubuntu/Debian machine with everything needed to run Locus.
#
# Usage:
#   curl -fsSL <raw-url>/scripts/setup.sh | bash -s -- \
#     --repo "https://github.com/user/project" \
#     --api-key "locus-api-key" \
#     --telegram-token "bot123:ABC" \
#     --telegram-chat-id "12345" \
#     --anthropic-key "sk-ant-..." \
#     --gh-token "ghp_..." \
#     --branch "main"
#
# Or download and run:
#   chmod +x setup.sh
#   ./setup.sh --repo "https://github.com/user/project" ...
#

set -euo pipefail

# ─── Colors & Output ──────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

info()    { echo -e "  ${BLUE}ℹ${RESET}  $1"; }
success() { echo -e "  ${GREEN}✔${RESET}  $1"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
error()   { echo -e "  ${RED}✖${RESET}  $1"; }
header()  { echo -e "\n${BOLD}${CYAN}  ── $1 ──${RESET}\n"; }

# ─── Parse Arguments ──────────────────────────────────────────────────────────

REPO_URL=""
BRANCH="main"
API_KEY=""
TELEGRAM_TOKEN=""
TELEGRAM_CHAT_ID=""
ANTHROPIC_KEY=""
GH_TOKEN=""
PROJECT_DIR=""
AGENT_COUNT="2"
SETUP_USER="${SUDO_USER:-$(whoami)}"
USER_HOME=$(eval echo "~${SETUP_USER}")

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)          REPO_URL="$2";          shift 2 ;;
    --branch)        BRANCH="$2";            shift 2 ;;
    --api-key)       API_KEY="$2";           shift 2 ;;
    --telegram-token) TELEGRAM_TOKEN="$2";   shift 2 ;;
    --telegram-chat-id) TELEGRAM_CHAT_ID="$2"; shift 2 ;;
    --anthropic-key) ANTHROPIC_KEY="$2";     shift 2 ;;
    --gh-token)      GH_TOKEN="$2";          shift 2 ;;
    --dir)           PROJECT_DIR="$2";       shift 2 ;;
    --agent-count)   AGENT_COUNT="$2";       shift 2 ;;
    --help|-h)
      echo ""
      echo "  Locus Development Environment Setup"
      echo ""
      echo "  Usage: ./setup.sh [options]"
      echo ""
      echo "  Options:"
      echo "    --repo <url>             Git repository to clone (required)"
      echo "    --branch <name>          Branch to checkout (default: main)"
      echo "    --dir <path>             Directory to clone into (default: derived from repo)"
      echo "    --api-key <key>          Locus API key"
      echo "    --anthropic-key <key>    Anthropic API key for Claude Code"
      echo "    --gh-token <token>       GitHub personal access token for gh CLI"
      echo "    --telegram-token <token> Telegram bot token from @BotFather"
      echo "    --telegram-chat-id <id>  Telegram chat ID for authorization"
      echo "    --agent-count <n>        Number of Locus agents (default: 2)"
      echo ""
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      echo "  Run with --help to see available options."
      exit 1
      ;;
  esac
done

# ─── Validation ───────────────────────────────────────────────────────────────

if [[ -z "$REPO_URL" ]]; then
  error "Missing required flag: --repo <url>"
  echo "  Example: ./setup.sh --repo https://github.com/user/project"
  exit 1
fi

# ─── Banner ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         Locus Environment Setup               ║"
echo "  ║         AI-Native Development Environment     ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

info "Repository:     ${BOLD}${REPO_URL}${RESET}"
info "Branch:         ${BOLD}${BRANCH}${RESET}"
info "User:           ${BOLD}${SETUP_USER}${RESET}"
info "API Key:        ${BOLD}${API_KEY:+configured}${API_KEY:-not set}${RESET}"
info "Anthropic Key:  ${BOLD}${ANTHROPIC_KEY:+configured}${ANTHROPIC_KEY:-not set}${RESET}"
info "GH Token:       ${BOLD}${GH_TOKEN:+configured}${GH_TOKEN:-not set}${RESET}"
info "Telegram:       ${BOLD}${TELEGRAM_TOKEN:+configured}${TELEGRAM_TOKEN:-not set}${RESET}"
echo ""

# ─── Helper: Run as setup user (not root) ─────────────────────────────────────

run_as_user() {
  if [[ "$(whoami)" == "root" && -n "$SUDO_USER" ]]; then
    sudo -u "$SETUP_USER" bash -c "$1"
  else
    bash -c "$1"
  fi
}

# ─── Step 1: System Packages ─────────────────────────────────────────────────

header "System Packages"

export DEBIAN_FRONTEND=noninteractive

if command -v apt-get &>/dev/null; then
  info "Updating package lists..."
  apt-get update -qq

  info "Installing base packages..."
  apt-get install -y -qq \
    curl wget git unzip build-essential \
    ca-certificates gnupg lsb-release \
    jq htop tmux > /dev/null 2>&1
  success "Base packages installed"
else
  warn "apt-get not found — skipping system package installation."
  warn "This script is designed for Ubuntu/Debian. Ensure git, curl, and build tools are installed."
fi

# ─── Step 2: Git ──────────────────────────────────────────────────────────────

header "Git"

if command -v git &>/dev/null; then
  success "Git already installed: $(git --version)"
else
  apt-get install -y -qq git > /dev/null 2>&1
  success "Git installed: $(git --version)"
fi

# ─── Step 3: GitHub CLI (gh) ──────────────────────────────────────────────────

header "GitHub CLI"

if command -v gh &>/dev/null; then
  success "GitHub CLI already installed: $(gh --version | head -1)"
else
  info "Installing GitHub CLI..."
  (type -p wget >/dev/null || apt-get install wget -y -qq > /dev/null 2>&1) \
    && mkdir -p -m 755 /etc/apt/keyrings \
    && out=$(mktemp) \
    && wget -nv -O "$out" https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && cat "$out" | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update -qq \
    && apt-get install gh -y -qq > /dev/null 2>&1
  success "GitHub CLI installed: $(gh --version | head -1)"
fi

# Authenticate gh if token provided
if [[ -n "$GH_TOKEN" ]]; then
  info "Authenticating GitHub CLI..."
  run_as_user "echo '${GH_TOKEN}' | gh auth login --with-token 2>/dev/null"
  success "GitHub CLI authenticated"
fi

# ─── Step 4: Node.js 22+ ─────────────────────────────────────────────────────

header "Node.js"

REQUIRED_NODE_MAJOR=22
INSTALL_NODE=true

if command -v node &>/dev/null; then
  CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$CURRENT_NODE" -ge "$REQUIRED_NODE_MAJOR" ]]; then
    success "Node.js already installed: $(node -v)"
    INSTALL_NODE=false
  else
    warn "Node.js $(node -v) found but need v${REQUIRED_NODE_MAJOR}+. Upgrading..."
  fi
fi

if [[ "$INSTALL_NODE" == "true" ]]; then
  info "Installing Node.js ${REQUIRED_NODE_MAJOR} via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  success "Node.js installed: $(node -v)"
fi

success "npm version: $(npm -v)"

# ─── Step 5: Bun ─────────────────────────────────────────────────────────────

header "Bun"

if run_as_user "command -v bun" &>/dev/null; then
  success "Bun already installed: $(run_as_user 'bun --version')"
else
  info "Installing Bun..."
  run_as_user 'curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1'
  # Ensure bun is on PATH for subsequent commands
  BUN_PATH="${USER_HOME}/.bun/bin"
  if [[ -d "$BUN_PATH" ]]; then
    export PATH="$BUN_PATH:$PATH"
    # Add to user's bashrc if not already there
    run_as_user "grep -q '.bun/bin' ~/.bashrc 2>/dev/null || echo 'export PATH=\"\$HOME/.bun/bin:\$PATH\"' >> ~/.bashrc"
  fi
  success "Bun installed: $(run_as_user 'export PATH="$HOME/.bun/bin:$PATH" && bun --version')"
fi

# ─── Step 6: Claude Code CLI ─────────────────────────────────────────────────

header "Claude Code"

if run_as_user "command -v claude" &>/dev/null; then
  success "Claude Code already installed"
else
  info "Installing Claude Code CLI..."
  npm install -g @anthropic-ai/claude-code > /dev/null 2>&1
  success "Claude Code installed"
fi

# Set Anthropic API key if provided
if [[ -n "$ANTHROPIC_KEY" ]]; then
  info "Configuring Anthropic API key..."
  # Write to user's environment
  run_as_user "grep -q 'ANTHROPIC_API_KEY' ~/.bashrc 2>/dev/null || echo 'export ANTHROPIC_API_KEY=\"${ANTHROPIC_KEY}\"' >> ~/.bashrc"
  export ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
  success "Anthropic API key configured in ~/.bashrc"
fi

# ─── Step 7: Locus CLI ───────────────────────────────────────────────────────

header "Locus CLI"

if command -v locus &>/dev/null; then
  success "Locus CLI already installed: $(locus --version 2>/dev/null || echo 'installed')"
else
  info "Installing Locus CLI from npm..."
  npm install -g @locusai/cli > /dev/null 2>&1
  success "Locus CLI installed"
fi

# ─── Step 8: Clone Repository ────────────────────────────────────────────────

header "Repository"

# Derive project directory from repo URL if not specified
if [[ -z "$PROJECT_DIR" ]]; then
  REPO_NAME=$(basename "$REPO_URL" .git)
  PROJECT_DIR="${USER_HOME}/${REPO_NAME}"
fi

if [[ -d "$PROJECT_DIR/.git" ]]; then
  info "Repository already exists at ${PROJECT_DIR}"
  info "Pulling latest changes..."
  run_as_user "cd '${PROJECT_DIR}' && git fetch origin && git checkout '${BRANCH}' 2>/dev/null && git pull origin '${BRANCH}' 2>/dev/null || true"
  success "Repository updated"
else
  info "Cloning ${REPO_URL} (branch: ${BRANCH})..."
  run_as_user "git clone --branch '${BRANCH}' '${REPO_URL}' '${PROJECT_DIR}'"
  success "Repository cloned to ${PROJECT_DIR}"
fi

# ─── Step 9: Install Dependencies ────────────────────────────────────────────

header "Dependencies"

info "Installing project dependencies with Bun..."
run_as_user "cd '${PROJECT_DIR}' && export PATH=\"\$HOME/.bun/bin:\$PATH\" && bun install"
success "Dependencies installed"

# ─── Step 10: Build Packages ─────────────────────────────────────────────────

header "Build"

info "Building packages (shared → sdk → cli → telegram)..."
run_as_user "cd '${PROJECT_DIR}' && export PATH=\"\$HOME/.bun/bin:\$PATH\" && bun run build"
success "Packages built"

# ─── Step 11: Initialize Locus ────────────────────────────────────────────────

header "Locus Init"

info "Initializing Locus in project..."
run_as_user "cd '${PROJECT_DIR}' && locus init"
success "Locus initialized"

# Configure API key if provided
if [[ -n "$API_KEY" ]]; then
  info "Configuring Locus API key..."
  run_as_user "cd '${PROJECT_DIR}' && locus config setup --api-key '${API_KEY}'"
  success "Locus API key configured"
fi

# ─── Step 12: Telegram Bot Setup ─────────────────────────────────────────────

header "Telegram Bot"

if [[ -n "$TELEGRAM_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
  info "Configuring Telegram bot..."
  run_as_user "cd '${PROJECT_DIR}' && locus telegram setup --token '${TELEGRAM_TOKEN}' --chat-id '${TELEGRAM_CHAT_ID}'"

  if [[ -n "$AGENT_COUNT" ]]; then
    run_as_user "cd '${PROJECT_DIR}' && locus telegram set agentCount '${AGENT_COUNT}'"
  fi

  success "Telegram bot configured"

  # Create systemd service for Telegram bot
  info "Creating systemd service for Telegram bot..."

  TELEGRAM_BIN="${PROJECT_DIR}/packages/telegram/bin/telegram.js"
  SERVICE_FILE="/etc/systemd/system/locus-telegram.service"

  cat > "$SERVICE_FILE" <<UNIT
[Unit]
Description=Locus Telegram Bot
After=network.target

[Service]
Type=simple
User=${SETUP_USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=$(which node) ${TELEGRAM_BIN}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=locus-telegram

# Environment
Environment=NODE_ENV=production
Environment=LOCUS_PROJECT_PATH=${PROJECT_DIR}
${ANTHROPIC_KEY:+Environment=ANTHROPIC_API_KEY=${ANTHROPIC_KEY}}

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  systemctl enable locus-telegram > /dev/null 2>&1
  systemctl start locus-telegram

  success "Telegram bot service created and started"
  info "Manage with: systemctl {start|stop|restart|status} locus-telegram"
  info "View logs:   journalctl -u locus-telegram -f"
else
  warn "Telegram not configured (missing --telegram-token or --telegram-chat-id)"
  info "Configure later with: locus telegram setup"
fi

# ─── Step 13: Verify Installation ─────────────────────────────────────────────

header "Verification"

CHECKS=()
FAILS=0

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" &>/dev/null; then
    success "$name"
    CHECKS+=("✔ $name")
  else
    error "$name"
    CHECKS+=("✖ $name")
    FAILS=$((FAILS + 1))
  fi
}

check "Git"         "command -v git"
check "GitHub CLI"  "command -v gh"
check "Node.js 22+" "node -v | grep -qE 'v(2[2-9]|[3-9][0-9])'"
check "Bun"         "run_as_user 'command -v bun'"
check "Claude Code"  "command -v claude"
check "Locus CLI"   "command -v locus"
check "Repository"  "test -d '${PROJECT_DIR}/.git'"
check "Locus Init"  "test -f '${PROJECT_DIR}/.locus/config.json'"

if [[ -n "$TELEGRAM_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
  check "Telegram Bot" "systemctl is-active --quiet locus-telegram"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         Setup Complete!                       ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

info "Project:    ${BOLD}${PROJECT_DIR}${RESET}"
info "Branch:     ${BOLD}${BRANCH}${RESET}"

if [[ "$FAILS" -eq 0 ]]; then
  success "All checks passed"
else
  warn "${FAILS} check(s) failed — review output above"
fi

echo ""
echo -e "  ${BOLD}Quick Start:${RESET}"
echo -e "    ${DIM}\$${RESET} cd ${PROJECT_DIR}"
echo -e "    ${DIM}\$${RESET} locus run                    ${DIM}# Start AI agents${RESET}"
echo -e "    ${DIM}\$${RESET} locus exec \"describe this project\" ${DIM}# Quick AI query${RESET}"
echo ""

if [[ -n "$TELEGRAM_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
  echo -e "  ${BOLD}Telegram Bot:${RESET}"
  echo -e "    ${DIM}\$${RESET} systemctl status locus-telegram"
  echo -e "    ${DIM}\$${RESET} journalctl -u locus-telegram -f"
  echo ""
fi

echo -e "  ${BOLD}Useful Commands:${RESET}"
echo -e "    ${DIM}\$${RESET} locus config show             ${DIM}# View configuration${RESET}"
echo -e "    ${DIM}\$${RESET} locus telegram config          ${DIM}# View Telegram config${RESET}"
echo -e "    ${DIM}\$${RESET} locus index                    ${DIM}# Index codebase for AI${RESET}"
echo -e "    ${DIM}\$${RESET} locus plan                     ${DIM}# AI planning session${RESET}"
echo ""
