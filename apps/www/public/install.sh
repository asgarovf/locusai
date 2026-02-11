#!/usr/bin/env bash
#
# Locus Development Environment Setup (Universal Installer)
# Auto-detects the operating system and runs the appropriate setup script.
#
# Usage (interactive):
#   curl -fsSL https://locusai.dev/install.sh | bash
#
# Usage (non-interactive):
#   curl -fsSL https://locusai.dev/install.sh | bash -s -- \
#     --repo "https://github.com/user/project" \
#     --api-key "locus-api-key" \
#     --telegram-token "bot123:ABC" \
#     --telegram-chat-id "12345" \
#     --gh-token "ghp_..." \
#     --branch "main"
#

set -euo pipefail

# ─── Colors & Output ──────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

info()    { echo -e "  \033[0;34mℹ\033[0m  $1"; }
success() { echo -e "  ${GREEN}✔${RESET}  $1"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
error()   { echo -e "  ${RED}✖${RESET}  $1"; }

# ─── Trim Function ───────────────────────────────────────────────────────────

trim() {
  local var="$*"
  # Remove leading whitespace
  var="${var#"${var%%[![:space:]]*}"}"
  # Remove trailing whitespace
  var="${var%"${var##*[![:space:]]}"}"
  printf '%s' "$var"
}

# ─── Detect OS ────────────────────────────────────────────────────────────────

BASE_URL="https://locusai.dev"
OS="$(uname -s)"

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         Locus Universal Installer             ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

case "$OS" in
  Darwin)
    info "Detected ${BOLD}macOS${RESET}"
    SCRIPT_URL="${BASE_URL}/setup-macos.sh"
    ;;
  Linux)
    info "Detected ${BOLD}Linux${RESET}"
    SCRIPT_URL="${BASE_URL}/setup.sh"
    ;;
  *)
    error "Unsupported operating system: ${OS}"
    error "Locus setup supports macOS and Linux (Ubuntu/Debian)."
    exit 1
    ;;
esac

# ─── Parse Arguments ──────────────────────────────────────────────────────────

REPO_URL=""
BRANCH=""
API_KEY=""
TELEGRAM_TOKEN=""
TELEGRAM_CHAT_ID=""
GH_TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)             REPO_URL="$2";          shift 2 ;;
    --branch)           BRANCH="$2";            shift 2 ;;
    --api-key)          API_KEY="$2";           shift 2 ;;
    --telegram-token)   TELEGRAM_TOKEN="$2";    shift 2 ;;
    --telegram-chat-id) TELEGRAM_CHAT_ID="$2";  shift 2 ;;
    --gh-token)         GH_TOKEN="$2";          shift 2 ;;
    --help|-h)
      echo ""
      echo "  Locus Universal Installer"
      echo ""
      echo "  Usage:"
      echo "    Interactive:     curl -fsSL https://locusai.dev/install.sh | bash"
      echo "    Non-interactive: curl -fsSL https://locusai.dev/install.sh | bash -s -- [options]"
      echo ""
      echo "  Options:"
      echo "    --repo <url>             Git repository to clone (required)"
      echo "    --branch <name>          Branch to checkout (default: main)"
      echo "    --api-key <key>          Locus API key"
      echo "    --gh-token <token>       GitHub personal access token"
      echo "    --telegram-token <token> Telegram bot token from @BotFather"
      echo "    --telegram-chat-id <id>  Telegram chat ID for authorization"
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
# If no --repo was provided via flags, prompt the user interactively.

if [[ -z "$REPO_URL" ]]; then
  echo ""
  echo -e "  ${BOLD}Interactive Setup${RESET}"
  echo -e "  ${DIM}Paste your values below. Press Enter to skip optional fields.${RESET}"
  echo ""

  # Ensure we can read from terminal even when piped
  if [[ -t 0 ]]; then
    INPUT_FD=0
  elif [[ -e /dev/tty ]]; then
    INPUT_FD=3
    exec 3</dev/tty
  else
    error "Cannot read interactive input. Please provide flags instead:"
    echo "  curl -fsSL https://locusai.dev/install.sh | bash -s -- --repo <url>"
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

      # Apply default if empty
      if [[ -z "$value" && -n "$default" ]]; then
        value="$default"
      fi

      # Validate required fields
      if [[ "$required" == "true" && -z "$value" ]]; then
        error "This field is required. Please enter a value."
        continue
      fi

      eval "$varname=\"\$value\""
      break
    done
  }

  prompt REPO_URL          "Repository URL"       true
  prompt BRANCH            "Branch"               false  "main"
  prompt API_KEY           "Locus API Key"        false
  prompt GH_TOKEN          "GitHub Token"         false
  prompt TELEGRAM_TOKEN    "Telegram Bot Token"   false
  prompt TELEGRAM_CHAT_ID  "Telegram Chat ID"     false

  # Close the extra FD if we opened one
  if [[ "${INPUT_FD:-0}" -eq 3 ]]; then
    exec 3<&-
  fi

  echo ""
fi

# ─── Confirm Configuration ───────────────────────────────────────────────────

echo -e "  ${BOLD}Configuration:${RESET}"
info "Repository:     ${BOLD}${REPO_URL}${RESET}"
info "Branch:         ${BOLD}${BRANCH:-main}${RESET}"
info "API Key:        ${BOLD}${API_KEY:+configured}${API_KEY:-not set}${RESET}"
info "GH Token:       ${BOLD}${GH_TOKEN:+configured}${GH_TOKEN:-not set}${RESET}"
info "Telegram Token: ${BOLD}${TELEGRAM_TOKEN:+configured}${TELEGRAM_TOKEN:-not set}${RESET}"
info "Telegram Chat:  ${BOLD}${TELEGRAM_CHAT_ID:+configured}${TELEGRAM_CHAT_ID:-not set}${RESET}"
echo ""

# ─── Build Arguments ─────────────────────────────────────────────────────────

ARGS=()
ARGS+=(--repo "$REPO_URL")

if [[ -n "${BRANCH:-}" ]]; then
  ARGS+=(--branch "$BRANCH")
fi
if [[ -n "$API_KEY" ]]; then
  ARGS+=(--api-key "$API_KEY")
fi
if [[ -n "$GH_TOKEN" ]]; then
  ARGS+=(--gh-token "$GH_TOKEN")
fi
if [[ -n "$TELEGRAM_TOKEN" ]]; then
  ARGS+=(--telegram-token "$TELEGRAM_TOKEN")
fi
if [[ -n "$TELEGRAM_CHAT_ID" ]]; then
  ARGS+=(--telegram-chat-id "$TELEGRAM_CHAT_ID")
fi

# ─── Download & Execute ──────────────────────────────────────────────────────

info "Fetching setup script for your platform..."
echo ""

curl -fsSL "$SCRIPT_URL" | bash -s -- "${ARGS[@]}"
