#!/bin/bash

# SYNOPSIS
#   Planckatron - Quantum Multi-Agent Orchestration for Claude Code
# DESCRIPTION
#   Displays the Planckatron splash screen and provides quick start instructions.
# EXAMPLE
#   ./planckatron.sh
#   ./planckatron.sh --help

APP_VERSION="3.0.0"

# === DARK MODE COLOR PALETTE ===
# Primary: Red (menacing)
# Secondary: Purple (mysterious)
# Text: White/Gray (readable)

RED='\033[0;31m'
BOLD_RED='\033[1;31m'
PURPLE='\033[0;35m'
BOLD_PURPLE='\033[1;35m'
WHITE='\033[1;37m'
GRAY='\033[1;30m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Accent colors (theme)
ACCENT=$RED
ACCENT_BOLD=$BOLD_RED
SECONDARY=$PURPLE
TEXT=$WHITE
MUTED=$GRAY

show_splash() {
    clear
    echo ""
    echo -e "${ACCENT_BOLD}══ PLANCKATRON v${APP_VERSION} ══════════════════════════════════════════${RESET}"
    echo ""
    echo -e "${MUTED}                        ▄  ■  ▄${RESET}"
    echo -e "${ACCENT}                       ┏━━━━━┓${RESET}"
    echo -e "${ACCENT}                       ┃${RESET}${WHITE} ◉ ◉ ${RESET}${ACCENT}┃${RESET}"
    echo -e "${ACCENT}                       ┃${RESET}${SECONDARY} ▼▼▼ ${RESET}${ACCENT}┃${RESET}"
    echo -e "${ACCENT}                       ┗━━━━━┛${RESET}"
    echo ""
    echo -e "${TEXT}         QUANTUM MULTI-AGENT ORCHESTRATION ${RESET}${BOLD_RED}ONLINE${RESET}"
    echo ""
    echo -e "${ACCENT_BOLD}═══════════════════════════════════════════════════════════════════${RESET}"
    echo ""
}

show_help() {
    show_splash
    echo -e "${BOLD_RED}  SYSTEM ACCESS GRANTED${RESET}"
    echo -e "${MUTED}  ─────────────────────${RESET}"
    echo ""
    echo -e "${TEXT}  1. Open Claude Code in your project${RESET}"
    echo -e "${TEXT}  2. Copy the prompt from:${RESET}"
    echo -e "${ACCENT}     .planckatron/templates/orchestrator-prompt.md${RESET}"
    echo -e "${TEXT}  3. Paste it into Claude Code${RESET}"
    echo -e "${TEXT}  4. Describe what you want to build${RESET}"
    echo ""
    echo -e "${TEXT}  OR simply say:${RESET}"
    echo -e "${SECONDARY}     'Act as Planckatron and build me [feature]'${RESET}"
    echo ""
    echo -e "${BOLD_RED}  WORKERS${RESET}"
    echo -e "${MUTED}  ───────${RESET}"
    echo ""
    echo -e "${ACCENT}  [A] ALPHA    ${TEXT}Foundation - layout, styles, config${RESET}"
    echo -e "${ACCENT}  [B] BETA     ${TEXT}Components - UI, data, hooks${RESET}"
    echo -e "${ACCENT}  [G] GAMMA    ${TEXT}Integration - pages, assembly${RESET}"
    echo ""
    echo -e "${BOLD_RED}  LINKS${RESET}"
    echo -e "${MUTED}  ─────${RESET}"
    echo ""
    echo -e "${TEXT}  GitHub: ${ACCENT}github.com/AgriciDaniel/quantum-planckatron${RESET}"
    echo ""
    echo -e "${ACCENT_BOLD}═══════════════════════════════════════════════════════════════════${RESET}"
    echo ""
}

show_version() {
    echo -e "${ACCENT}PLANCKATRON v${APP_VERSION}${RESET}"
}

# Main
case "$1" in
    --version|-v)
        show_version
        ;;
    --help|-h)
        show_help
        ;;
    *)
        show_help
        ;;
esac
