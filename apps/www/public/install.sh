#!/usr/bin/env bash
#
# Locus Development Environment Setup (Universal Installer)
# Auto-detects the operating system and runs the appropriate setup script.
#
# Usage (interactive):
#   curl -fsSL https://locusai.dev/install.sh | bash
#
# Usage (non-interactive, personal machine):
#   curl -fsSL https://locusai.dev/install.sh | bash -s -- \
#     --repo "https://github.com/user/project" \
#     --api-key "locus-api-key" \
#     --telegram-token "bot123:ABC" \
#     --telegram-chat-id "12345" \
#     --gh-token "ghp_..." \
#     --branch "main"
#
# Usage (server setup — creates a dedicated user):
#   curl -fsSL https://locusai.dev/install.sh | bash -s -- --server \
#     --repo "https://github.com/user/project" \
#     --api-key "locus-api-key"
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
  MINGW*|MSYS*|CYGWIN*)
    info "Detected ${BOLD}Windows${RESET} (via $OS)"
    echo ""
    warn "This bash installer is not supported on Windows."
    info "Please use the PowerShell installer instead:"
    echo ""
    echo -e "  ${BOLD}Interactive:${RESET}"
    echo -e "    ${DIM}>${RESET} irm https://locusai.dev/install.ps1 | iex"
    echo ""
    echo -e "  ${BOLD}Non-interactive:${RESET}"
    echo -e "    ${DIM}>${RESET} .\\install.ps1 -Repo \"https://github.com/user/project\" -Branch \"main\""
    echo ""
    exit 1
    ;;
  *)
    error "Unsupported operating system: ${OS}"
    error "Locus setup supports macOS, Linux (Ubuntu/Debian), and Windows (PowerShell)."
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
SETUP_USER=""
SERVER_MODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)             REPO_URL="$2";          shift 2 ;;
    --branch)           BRANCH="$2";            shift 2 ;;
    --api-key)          API_KEY="$2";           shift 2 ;;
    --telegram-token)   TELEGRAM_TOKEN="$2";    shift 2 ;;
    --telegram-chat-id) TELEGRAM_CHAT_ID="$2";  shift 2 ;;
    --gh-token)         GH_TOKEN="$2";          shift 2 ;;
    --user)             SETUP_USER="$2";        shift 2 ;;
    --server)           SERVER_MODE=true;       shift ;;
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
      echo "    --server                 Server mode: create a dedicated user for Locus"
      echo "    --user <username>        Username for server mode (default: locus-agent)"
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

# ─── User Setup (server mode only) ──────────────────────────────────────────
# When --server is passed, we create a dedicated non-root user to own the
# project and run all tools. This is intended for server/VPS deployments.
# Without --server, we assume the user is installing on their own machine.

if [[ "$SERVER_MODE" == "true" && "$OS" == "Linux" && "$(id -u)" -eq 0 ]]; then
  DEFAULT_USER="${SETUP_USER:-locus-agent}"

  echo -e "  ${BOLD}Server Mode — User Setup${RESET}"
  echo -e "  ${DIM}Creating a dedicated non-root user to run Locus.${RESET}"
  echo ""

  # Ensure we can read from terminal even when piped
  if [[ -t 0 ]]; then
    USER_INPUT_FD=0
  elif [[ -e /dev/tty ]]; then
    USER_INPUT_FD=4
    exec 4</dev/tty
  else
    # Non-interactive: use the provided --user or default
    info "Non-interactive mode: using user '${DEFAULT_USER}'"
    SETUP_USER="$DEFAULT_USER"
    USER_INPUT_FD=""
  fi

  SKIP_USER_CREATION=false

  if [[ -n "${USER_INPUT_FD:-}" ]]; then
    # Ask permission to create user
    echo -en "  ${BOLD}Create user '${DEFAULT_USER}' for Locus?${RESET} ${DIM}[Y/n]:${RESET} "
    REPLY=""
    if [[ "$USER_INPUT_FD" -eq 0 ]]; then
      read -r REPLY
    else
      read -r REPLY <&4
    fi
    REPLY="$(trim "${REPLY:-Y}")"

    if [[ "$REPLY" =~ ^[Nn] ]]; then
      # Let user specify a different username
      echo -en "  ${BOLD}Enter username to use instead${RESET} ${DIM}(or press Enter to run as root — not recommended):${RESET} "
      CUSTOM_USER=""
      if [[ "$USER_INPUT_FD" -eq 0 ]]; then
        read -r CUSTOM_USER
      else
        read -r CUSTOM_USER <&4
      fi
      CUSTOM_USER="$(trim "$CUSTOM_USER")"

      if [[ -z "$CUSTOM_USER" ]]; then
        warn "Continuing as root. Some tools may not work correctly."
        SKIP_USER_CREATION=true
      else
        DEFAULT_USER="$CUSTOM_USER"
      fi
    fi

    # Ask about passwordless sudo
    if [[ "$SKIP_USER_CREATION" != "true" ]]; then
      echo -en "  ${BOLD}Grant '${DEFAULT_USER}' passwordless sudo access?${RESET} ${DIM}(required for installing packages) [Y/n]:${RESET} "
      REPLY=""
      if [[ "$USER_INPUT_FD" -eq 0 ]]; then
        read -r REPLY
      else
        read -r REPLY <&4
      fi
      REPLY="$(trim "${REPLY:-Y}")"

      GRANT_SUDO=true
      if [[ "$REPLY" =~ ^[Nn] ]]; then
        GRANT_SUDO=false
        warn "Skipping sudo setup. The user may not be able to install system packages."
      fi
    fi

    # Close extra FD if we opened one
    if [[ "${USER_INPUT_FD:-0}" -eq 4 ]]; then
      exec 4<&-
    fi
  fi

  if [[ "$SKIP_USER_CREATION" != "true" ]]; then
    SETUP_USER="$DEFAULT_USER"

    # Create user if it doesn't exist
    if id "$SETUP_USER" &>/dev/null; then
      info "User '${SETUP_USER}' already exists"
    else
      info "Creating user '${SETUP_USER}'..."
      useradd -m -s /bin/bash "$SETUP_USER"
      success "User '${SETUP_USER}' created"
    fi

    # Grant passwordless sudo
    if [[ "${GRANT_SUDO:-true}" == "true" ]]; then
      info "Granting passwordless sudo to '${SETUP_USER}'..."
      echo "${SETUP_USER} ALL=(ALL) NOPASSWD: ALL" > "/etc/sudoers.d/${SETUP_USER}"
      chmod 440 "/etc/sudoers.d/${SETUP_USER}"
      success "Passwordless sudo configured"
    fi

    # Add to docker group if it exists
    if getent group docker &>/dev/null; then
      usermod -aG docker "$SETUP_USER"
      success "Added '${SETUP_USER}' to docker group"
    fi

    # Copy SSH authorized_keys from root so the user can SSH in
    ROOT_AUTH_KEYS="/root/.ssh/authorized_keys"
    USER_HOME="$(eval echo "~${SETUP_USER}")"
    USER_SSH_DIR="${USER_HOME}/.ssh"

    if [[ -f "$ROOT_AUTH_KEYS" ]]; then
      info "Copying SSH authorized keys to '${SETUP_USER}'..."
      mkdir -p "$USER_SSH_DIR"
      cp "$ROOT_AUTH_KEYS" "${USER_SSH_DIR}/authorized_keys"
      chown -R "${SETUP_USER}:${SETUP_USER}" "$USER_SSH_DIR"
      chmod 700 "$USER_SSH_DIR"
      chmod 600 "${USER_SSH_DIR}/authorized_keys"
      success "SSH keys copied — you can now SSH as '${SETUP_USER}'"
    else
      warn "No SSH keys found at ${ROOT_AUTH_KEYS} — skipping SSH key copy"
    fi

    echo ""
    info "Switching to user '${SETUP_USER}' for installation..."
    echo ""
  fi
elif [[ "$SERVER_MODE" == "true" && "$OS" == "Linux" && "$(id -u)" -ne 0 ]]; then
  warn "Server mode requires running as root to create users."
  warn "Re-run with: sudo bash -s -- --server ..."
  exit 1
fi

# ─── Confirm Configuration ───────────────────────────────────────────────────

echo -e "  ${BOLD}Configuration:${RESET}"
info "Repository:     ${BOLD}${REPO_URL}${RESET}"
info "Branch:         ${BOLD}${BRANCH:-main}${RESET}"
if [[ -n "${SETUP_USER:-}" ]]; then
  info "Setup User:     ${BOLD}${SETUP_USER}${RESET}"
fi
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
if [[ -n "${SETUP_USER:-}" ]]; then
  ARGS+=(--user "$SETUP_USER")
fi

# ─── Download & Execute ──────────────────────────────────────────────────────

info "Fetching setup script for your platform..."
echo ""

if [[ -n "${SETUP_USER:-}" && "$(id -u)" -eq 0 && "$SETUP_USER" != "root" ]]; then
  # Re-invoke setup.sh as the dedicated user via sudo
  # Download the script to a temp file so we can run it as another user
  SETUP_SCRIPT=$(mktemp)
  curl -fsSL "$SCRIPT_URL" -o "$SETUP_SCRIPT"
  chmod +x "$SETUP_SCRIPT"
  sudo -u "$SETUP_USER" bash "$SETUP_SCRIPT" "${ARGS[@]}"
  rm -f "$SETUP_SCRIPT"
else
  curl -fsSL "$SCRIPT_URL" | bash -s -- "${ARGS[@]}"
fi
