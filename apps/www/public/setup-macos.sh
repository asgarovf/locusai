#!/usr/bin/env bash
#
# Locus Development Environment Setup (macOS)
# Provisions a fresh macOS machine with everything needed to run Locus.
#
# Usage (interactive):
#   curl -fsSL https://locusai.dev/setup-macos.sh | bash
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

# ─── Platform Check ──────────────────────────────────────────────────────────

if [[ "$(uname -s)" != "Darwin" ]]; then
  error "This script is designed for macOS. Use https://locusai.dev/setup.sh for Linux."
  exit 1
fi

# ─── Parse Arguments ──────────────────────────────────────────────────────────

REPO_URL=""
BRANCH="main"
GH_TOKEN=""
PROJECT_DIR=""
USER_HOME="$HOME"

# Detect default shell config file
if [[ -f "$HOME/.zshrc" ]] || [[ "$SHELL" == */zsh ]]; then
  SHELL_RC="$HOME/.zshrc"
else
  SHELL_RC="$HOME/.bashrc"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)          REPO_URL="$2";          shift 2 ;;
    --branch)        BRANCH="$2";            shift 2 ;;
    --gh-token)      GH_TOKEN="$2";          shift 2 ;;
    --dir)           PROJECT_DIR="$2";       shift 2 ;;
    --help|-h)
      echo ""
      echo "  Locus Development Environment Setup (macOS)"
      echo ""
      echo "  Usage: ./setup-macos.sh [options]"
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
    echo "  curl -fsSL https://locusai.dev/setup-macos.sh | bash -s -- --repo <url>"
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

# ─── Banner ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         Locus Environment Setup (macOS)       ║"
echo "  ║         GitHub-Native AI Sprint Execution     ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

info "Repository:     ${BOLD}${REPO_URL}${RESET}"
info "Branch:         ${BOLD}${BRANCH}${RESET}"
info "User:           ${BOLD}$(whoami)${RESET}"
info "Shell config:   ${BOLD}${SHELL_RC}${RESET}"
info "GH Token:       ${BOLD}${GH_TOKEN:+configured}${GH_TOKEN:-not set}${RESET}"
echo ""

# ─── Step 1: Xcode Command Line Tools ────────────────────────────────────────

header "Xcode Command Line Tools"

if xcode-select -p &>/dev/null; then
  success "Xcode CLT already installed"
else
  info "Installing Xcode Command Line Tools..."
  xcode-select --install 2>/dev/null || true
  until xcode-select -p &>/dev/null; do
    sleep 5
  done
  success "Xcode CLT installed"
fi

# ─── Step 2: Git ──────────────────────────────────────────────────────────────

header "Git"

if command -v git &>/dev/null; then
  success "Git already installed: $(git --version)"
else
  error "Git not found. It should have been installed with Xcode Command Line Tools."
  error "Try running: xcode-select --install"
  exit 1
fi

# ─── Step 3: GitHub CLI (gh) ─────────────────────────────────────────────────

header "GitHub CLI"

if command -v gh &>/dev/null; then
  success "GitHub CLI already installed: $(gh --version | head -1)"
else
  info "Installing GitHub CLI..."

  ARCH="$(uname -m)"
  if [[ "$ARCH" == "arm64" ]]; then
    GH_ARCH="macOS_arm64"
  else
    GH_ARCH="macOS_amd64"
  fi

  GH_LATEST=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
  GH_TAR="gh_${GH_LATEST}_${GH_ARCH}.zip"
  GH_URL="https://github.com/cli/cli/releases/download/v${GH_LATEST}/${GH_TAR}"

  GH_TMP="$(mktemp -d)"
  curl -fsSL -o "${GH_TMP}/${GH_TAR}" "$GH_URL"
  unzip -q "${GH_TMP}/${GH_TAR}" -d "${GH_TMP}"
  cp "${GH_TMP}/gh_${GH_LATEST}_${GH_ARCH}/bin/gh" /usr/local/bin/gh 2>/dev/null || \
    sudo cp "${GH_TMP}/gh_${GH_LATEST}_${GH_ARCH}/bin/gh" /usr/local/bin/gh
  chmod +x /usr/local/bin/gh 2>/dev/null || sudo chmod +x /usr/local/bin/gh
  rm -rf "$GH_TMP"

  success "GitHub CLI installed: $(gh --version | head -1)"
fi

# Authenticate gh if token provided
if [[ -n "$GH_TOKEN" ]]; then
  info "Authenticating GitHub CLI..."
  echo "$GH_TOKEN" | gh auth login --with-token --hostname github.com --git-protocol https
  if gh auth status --hostname github.com &>/dev/null; then
    success "GitHub CLI authenticated"
    gh auth setup-git
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
    warn "Node.js $(node -v) found but need v${REQUIRED_NODE_MAJOR}+. Installing..."
  fi
fi

if [[ "$INSTALL_NODE" == "true" ]]; then
  info "Installing Node.js ${REQUIRED_NODE_MAJOR} via official installer..."

  ARCH="$(uname -m)"
  if [[ "$ARCH" == "arm64" ]]; then
    NODE_ARCH="arm64"
  else
    NODE_ARCH="x64"
  fi

  NODE_VERSION=$(curl -fsSL https://nodejs.org/dist/latest-v${REQUIRED_NODE_MAJOR}.x/ \
    | grep -oE "v${REQUIRED_NODE_MAJOR}\.[0-9]+\.[0-9]+" | head -1)

  NODE_TAR="node-${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
  NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TAR}"

  NODE_TMP="$(mktemp -d)"
  info "Downloading Node.js ${NODE_VERSION}..."
  curl -fsSL -o "${NODE_TMP}/${NODE_TAR}" "$NODE_URL"
  tar -xzf "${NODE_TMP}/${NODE_TAR}" -C "${NODE_TMP}"

  NODE_EXTRACTED="${NODE_TMP}/node-${NODE_VERSION}-darwin-${NODE_ARCH}"

  sudo cp -R "${NODE_EXTRACTED}/bin/"* /usr/local/bin/ 2>/dev/null || \
    cp -R "${NODE_EXTRACTED}/bin/"* /usr/local/bin/
  sudo cp -R "${NODE_EXTRACTED}/lib/"* /usr/local/lib/ 2>/dev/null || \
    cp -R "${NODE_EXTRACTED}/lib/"* /usr/local/lib/
  sudo cp -R "${NODE_EXTRACTED}/include/"* /usr/local/include/ 2>/dev/null || \
    cp -R "${NODE_EXTRACTED}/include/"* /usr/local/include/
  sudo cp -R "${NODE_EXTRACTED}/share/"* /usr/local/share/ 2>/dev/null || \
    cp -R "${NODE_EXTRACTED}/share/"* /usr/local/share/

  rm -rf "$NODE_TMP"

  if ! echo "$PATH" | grep -q '/usr/local/bin'; then
    export PATH="/usr/local/bin:$PATH"
    grep -q '/usr/local/bin' "$SHELL_RC" 2>/dev/null || \
      echo 'export PATH="/usr/local/bin:$PATH"' >> "$SHELL_RC"
  fi

  success "Node.js installed: $(node -v)"
fi

success "npm version: $(npm -v)"

# ─── Step 5: Bun ─────────────────────────────────────────────────────────────

header "Bun"

if command -v bun &>/dev/null; then
  success "Bun already installed: $(bun --version)"
else
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1

  BUN_PATH="$HOME/.bun/bin"
  if [[ -d "$BUN_PATH" ]]; then
    export PATH="$BUN_PATH:$PATH"
    grep -q '.bun/bin' "$SHELL_RC" 2>/dev/null || \
      echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$SHELL_RC"
  fi

  success "Bun installed: $(bun --version)"
fi

# ─── Step 6: Claude Code CLI ─────────────────────────────────────────────────

header "Claude Code"

if command -v claude &>/dev/null; then
  success "Claude Code already installed"
else
  info "Installing Claude Code via native installer..."
  curl -fsSL https://claude.ai/install.sh | bash > /dev/null 2>&1

  CLAUDE_PATH="$HOME/.local/bin"
  if [[ -d "$CLAUDE_PATH" ]]; then
    export PATH="$CLAUDE_PATH:$PATH"
    grep -q '.local/bin' "$SHELL_RC" 2>/dev/null || \
      echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
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
  npm install -g @locusai/cli > /dev/null 2>&1
  success "Locus CLI installed"
fi

# ─── Step 8: Clone Repository ────────────────────────────────────────────────

header "Repository"

if [[ -z "$PROJECT_DIR" ]]; then
  REPO_NAME=$(basename "$REPO_URL" .git)
  PROJECT_DIR="$(pwd)/${REPO_NAME}"
fi

if [[ -d "$PROJECT_DIR/.git" ]]; then
  info "Repository already exists at ${PROJECT_DIR}"
  info "Pulling latest changes..."
  cd "$PROJECT_DIR" && git fetch origin && git checkout "$BRANCH" 2>/dev/null && git pull origin "$BRANCH" 2>/dev/null || true
  success "Repository updated"
else
  info "Cloning ${REPO_URL} (branch: ${BRANCH})..."

  if git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"; then
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
cd "$PROJECT_DIR" && locus init
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
check "Bun"         "command -v bun"
check "Claude Code" "command -v claude"
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
