#!/usr/bin/env bash
#
# Locus Development Environment Setup (Universal Installer)
# Auto-detects the operating system and runs the appropriate setup script.
#
# Usage:
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
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "  \033[0;34mℹ\033[0m  $1"; }
error()   { echo -e "  ${RED}✖${RESET}  $1"; }

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
    info "Detected ${BOLD}macOS${RESET} — downloading macOS setup script..."
    SCRIPT_URL="${BASE_URL}/setup-macos.sh"
    ;;
  Linux)
    info "Detected ${BOLD}Linux${RESET} — downloading Linux setup script..."
    SCRIPT_URL="${BASE_URL}/setup.sh"
    ;;
  *)
    error "Unsupported operating system: ${OS}"
    error "Locus setup supports macOS and Linux (Ubuntu/Debian)."
    exit 1
    ;;
esac

# ─── Download & Execute ──────────────────────────────────────────────────────

info "Fetching ${SCRIPT_URL}..."
echo ""

curl -fsSL "$SCRIPT_URL" | bash -s -- "$@"
