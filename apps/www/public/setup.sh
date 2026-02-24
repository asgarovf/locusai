#!/usr/bin/env bash
#
# Locus Development Environment Setup
# Provisions a fresh Ubuntu/Debian machine with everything needed to run Locus.
#
# Usage (interactive):
#   curl -fsSL https://locusai.dev/setup.sh | bash
#
# Usage (non-interactive):
#   curl -fsSL https://locusai.dev/install.sh | bash -s -- \
#     --repo "https://github.com/user/project.git" \
#     --gh-token "ghp_..." \
#     --branch "main"
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

# ─── Trim Function ───────────────────────────────────────────────────────────

trim() {
  local var="$*"
  var="${var#"${var%%[![:space:]]*}"}"
  var="${var%"${var##*[![:space:]]}"}"
  printf '%s' "$var"
}

# ─── Parse Arguments ──────────────────────────────────────────────────────────

REPO_URL=""
BRANCH="main"
GH_TOKEN=""
PROJECT_DIR=""

# ─── Privilege Helper ────────────────────────────────────────────────────────
# Use sudo for system commands when not running as root.

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)          REPO_URL="$2";          shift 2 ;;
    --branch)        BRANCH="$2";            shift 2 ;;
    --gh-token)      GH_TOKEN="$2";          shift 2 ;;
    --dir)           PROJECT_DIR="$2";       shift 2 ;;
    --help|-h)
      echo ""
      echo "  Locus Development Environment Setup"
      echo ""
      echo "  Usage: ./setup.sh [options]"
      echo ""
      echo "  Options:"
      echo "    --repo <url>             Git repository HTTPS URL to clone (required)"
      echo "    --branch <name>          Branch to checkout (default: main)"
      echo "    --dir <path>             Directory to clone into (default: derived from repo)"
      echo "    --gh-token <token>       GitHub personal access token for gh CLI"
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

# ─── Interactive Mode ────────────────────────────────────────────────────────

if [[ -z "$REPO_URL" ]]; then
  echo ""
  echo -e "  ${BOLD}Interactive Setup${RESET}"
  echo -e "  ${DIM}Paste your values below. Press Enter to skip optional fields.${RESET}"
  echo ""

  if [[ -t 0 ]]; then
    INPUT_FD=0
  elif [[ -e /dev/tty ]]; then
    INPUT_FD=3
    exec 3</dev/tty
  else
    error "Cannot read interactive input. Please provide flags instead:"
    echo "  curl -fsSL https://locusai.dev/setup.sh | bash -s -- --repo <url>"
    exit 1
  fi

  prompt() {
    local varname="$1" label="$2" required="${3:-false}" default="${4:-}"

    local suffix=""
    if [[ -n "$default" ]]; then
      suffix=" ${DIM}(default: ${default})${RESET}"
    elif [[ "$required" == "true" ]]; then
      suffix=" ${RED}(required)${RESET}"
    else
      suffix=" ${DIM}(optional, press Enter to skip)${RESET}"
    fi

    while true; do
      echo -en "  ${BOLD}${label}${RESET}${suffix}: "
      local value=""
      if [[ "$INPUT_FD" -eq 0 ]]; then
        read -r value
      else
        read -r value <&3
      fi
      value="$(trim "$value")"

      if [[ -z "$value" && -n "$default" ]]; then
        value="$default"
      fi

      if [[ "$required" == "true" && -z "$value" ]]; then
        error "This field is required. Please enter a value."
        continue
      fi

      eval "$varname=\"\$value\""
      break
    done
  }

  prompt REPO_URL          "Repository HTTPS URL (e.g. https://github.com/user/repo.git)" true
  prompt BRANCH            "Branch"               false  "main"
  prompt GH_TOKEN          "GitHub Token"         false

  if [[ "${INPUT_FD:-0}" -eq 3 ]]; then
    exec 3<&-
  fi

  echo ""
fi

# ─── Validate Repository URL ─────────────────────────────────────────────────

if [[ "$REPO_URL" == git@* ]] || [[ "$REPO_URL" == ssh://* ]]; then
  error "SSH repository URLs are not supported. Please use an HTTPS URL."
  error "Example: https://github.com/user/repo.git"
  exit 1
fi

# ─── Resolve Setup User ──────────────────────────────────────────────────────

if [[ -n "${SUDO_USER:-}" ]]; then
  SETUP_USER="$SUDO_USER"
else
  SETUP_USER="$(whoami)"
fi

USER_HOME=$(eval echo "~${SETUP_USER}")

# ─── Helper: Run as setup user (not root) ─────────────────────────────────────

run_as_user() {
  if [[ "$(whoami)" == "$SETUP_USER" ]]; then
    bash -c "$1"
  elif [[ "$(id -u)" -eq 0 ]]; then
    sudo -u "$SETUP_USER" bash -c "$1"
  else
    bash -c "$1"
  fi
}

# ─── Banner ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         Locus Environment Setup               ║"
echo "  ║         GitHub-Native AI Sprint Execution     ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

info "Repository:     ${BOLD}${REPO_URL}${RESET}"
info "Branch:         ${BOLD}${BRANCH}${RESET}"
info "User:           ${BOLD}${SETUP_USER}${RESET}"
info "GH Token:       ${BOLD}${GH_TOKEN:+configured}${GH_TOKEN:-not set}${RESET}"
echo ""

# ─── Step 1: System Packages ─────────────────────────────────────────────────

header "System Packages"

export DEBIAN_FRONTEND=noninteractive

if command -v apt-get &>/dev/null; then
  info "Updating package lists..."
  $SUDO apt-get update -qq

  info "Installing base packages..."
  $SUDO apt-get install -y -qq \
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
  $SUDO apt-get install -y -qq git > /dev/null 2>&1
  success "Git installed: $(git --version)"
fi

# ─── Step 3: GitHub CLI (gh) ──────────────────────────────────────────────────

header "GitHub CLI"

if command -v gh &>/dev/null; then
  success "GitHub CLI already installed: $(gh --version | head -1)"
else
  info "Installing GitHub CLI..."
  (type -p wget >/dev/null || $SUDO apt-get install wget -y -qq > /dev/null 2>&1) \
    && $SUDO mkdir -p -m 755 /etc/apt/keyrings \
    && out=$(mktemp) \
    && wget -nv -O "$out" https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && cat "$out" | $SUDO tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && $SUDO chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | $SUDO tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && $SUDO apt-get update -qq \
    && $SUDO apt-get install gh -y -qq > /dev/null 2>&1
  success "GitHub CLI installed: $(gh --version | head -1)"
fi

# Authenticate gh if token provided
if [[ -n "$GH_TOKEN" ]]; then
  info "Authenticating GitHub CLI..."
  run_as_user "echo '${GH_TOKEN}' | gh auth login --with-token --hostname github.com --git-protocol https"
  if run_as_user "gh auth status --hostname github.com" &>/dev/null; then
    success "GitHub CLI authenticated"
    run_as_user "gh auth setup-git"
    success "Git credential helper configured (via gh)"
  else
    warn "GitHub CLI authentication failed — verify your token is valid"
  fi
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
  curl -fsSL https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x | $SUDO bash - > /dev/null 2>&1
  $SUDO apt-get install -y -qq nodejs > /dev/null 2>&1
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
  BUN_PATH="${USER_HOME}/.bun/bin"
  if [[ -d "$BUN_PATH" ]]; then
    export PATH="$BUN_PATH:$PATH"
    run_as_user "grep -q '.bun/bin' ~/.bashrc 2>/dev/null || echo 'export PATH=\"\$HOME/.bun/bin:\$PATH\"' >> ~/.bashrc"
  fi
  success "Bun installed: $(run_as_user 'export PATH="$HOME/.bun/bin:$PATH" && bun --version')"
fi

# ─── Step 6: Claude Code CLI ─────────────────────────────────────────────────

header "Claude Code"

if run_as_user "command -v claude" &>/dev/null; then
  success "Claude Code already installed"
else
  info "Installing Claude Code via native installer..."
  run_as_user "curl -fsSL https://claude.ai/install.sh | bash" > /dev/null 2>&1

  CLAUDE_PATH="${USER_HOME}/.local/bin"
  if [[ -d "$CLAUDE_PATH" ]]; then
    export PATH="$CLAUDE_PATH:$PATH"
    run_as_user "grep -q '.local/bin' ~/.bashrc 2>/dev/null || echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
  fi

  success "Claude Code installed"
fi

info "Configure Claude Code / Codex authentication separately after setup"
info "  Claude: claude login"
info "  Codex:  Follow OpenAI Codex setup instructions"

# ─── Step 7: Locus CLI ───────────────────────────────────────────────────────

header "Locus CLI"

if command -v locus &>/dev/null; then
  success "Locus CLI already installed: $(locus --version 2>/dev/null || echo 'installed')"
else
  info "Installing Locus CLI from npm..."
  $SUDO npm install -g @locusai/cli > /dev/null 2>&1
  success "Locus CLI installed"
fi

# ─── Step 8: Clone Repository ────────────────────────────────────────────────

header "Repository"

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

  if run_as_user "git clone --branch '${BRANCH}' '${REPO_URL}' '${PROJECT_DIR}'"; then
    success "Repository cloned to ${PROJECT_DIR}"
  else
    error "Failed to clone repository."
    if [[ -n "$GH_TOKEN" ]]; then
      error "gh auth is configured but clone failed — verify the token has repo access."
    else
      error "Provide --gh-token for HTTPS authentication."
    fi
    exit 1
  fi
fi

# ─── Step 9: Initialize Locus ────────────────────────────────────────────────

header "Locus Init"

info "Initializing Locus in project..."
run_as_user "cd '${PROJECT_DIR}' && locus init"
success "Locus initialized"

# ─── Step 10: Verify Installation ────────────────────────────────────────────

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

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         Setup Complete!                       ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

info "Project:    ${BOLD}${PROJECT_DIR}${RESET}"
info "Branch:     ${BOLD}${BRANCH}${RESET}"
info "User:       ${BOLD}${SETUP_USER}${RESET}"

if [[ "$FAILS" -eq 0 ]]; then
  success "All checks passed"
else
  warn "${FAILS} check(s) failed — review output above"
fi

echo ""
echo -e "  ${BOLD}Quick Start:${RESET}"
echo -e "    ${DIM}\$${RESET} cd ${PROJECT_DIR}"
echo -e "    ${DIM}\$${RESET} locus plan                     ${DIM}# AI sprint planning${RESET}"
echo -e "    ${DIM}\$${RESET} locus run                      ${DIM}# Execute sprint tasks${RESET}"
echo -e "    ${DIM}\$${RESET} locus exec \"describe this project\" ${DIM}# Quick AI query${RESET}"
echo ""

echo -e "  ${BOLD}Useful Commands:${RESET}"
echo -e "    ${DIM}\$${RESET} locus config show              ${DIM}# View configuration${RESET}"
echo -e "    ${DIM}\$${RESET} locus status                   ${DIM}# View sprint status${RESET}"
echo -e "    ${DIM}\$${RESET} locus review                   ${DIM}# AI code review${RESET}"
echo ""

echo -e "  ${BOLD}Agent CLI Setup:${RESET}"
echo -e "  ${DIM}Locus requires an AI agent CLI to run tasks. If you haven't set one up yet:${RESET}"
echo ""
echo -e "    ${CYAN}Claude Code${RESET}  https://code.claude.com/docs"
echo -e "    ${CYAN}OpenAI Codex${RESET} https://developers.openai.com/codex/cli/"
echo ""
