#!/bin/bash

# SYNOPSIS
#   Installs Planckatron to a target project.
# DESCRIPTION
#   Copies the Planckatron orchestration system to a target project directory.
# EXAMPLE
#   ./install.sh --target /path/to/project

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

# Theme aliases
ACCENT=$RED
ACCENT_BOLD=$BOLD_RED
SECONDARY=$PURPLE
SUCCESS=$PURPLE
TEXT=$WHITE
MUTED=$GRAY
WARN=$YELLOW

# Default variables
TARGET=""
INCLUDE_README=false
FORCE=false

# Helper function for status messages
write_status() {
    local status=$1
    local message=$2
    local color=$WHITE
    local symbol="[?]"

    case $status in
        "OK")     color=$SUCCESS; symbol="[LOCKED]";;
        "ERROR")  color=$RED; symbol="[BREACH]";;
        "COPY")   color=$ACCENT; symbol="[UPLOAD]";;
        "SKIP")   color=$WARN; symbol="[BYPASS]";;
        "INFO")   color=$MUTED; symbol="[SCAN]";;
    esac

    echo -e "${color}${symbol} ${RESET}${message}"
}

show_help() {
    echo -e "${ACCENT}Usage: ./install.sh --target <path> [options]${RESET}"
    echo ""
    echo -e "${TEXT}Options:${RESET}"
    echo -e "${MUTED}  --target <path>    Target project directory (Required)${RESET}"
    echo -e "${MUTED}  --include-readme   Copy README.md file${RESET}"
    echo -e "${MUTED}  --force            Overwrite existing installation${RESET}"
    echo -e "${MUTED}  --help             Show this help message${RESET}"
    echo ""
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --target) TARGET="$2"; shift ;;
        --include-readme) INCLUDE_README=true ;;
        --force) FORCE=true ;;
        --help) show_help; exit 0 ;;
        *) echo -e "${RED}[BREACH] Unknown parameter: $1${RESET}"; exit 1 ;;
    esac
    shift
done

if [ -z "$TARGET" ]; then
    echo -e "${RED}[BREACH] Target directory is required.${RESET}"
    echo -e "${WARN}Usage: ./install.sh --target \"/path/to/project\"${RESET}"
    exit 1
fi

# Determine paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_ROOT="$SCRIPT_DIR"
# Assuming script is in root. If in scripts/, use: SOURCE_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE_PLANCKATRON="$SOURCE_ROOT/.planckatron"
SOURCE_CLAUDE_MD="$SOURCE_ROOT/CLAUDE.md"
SOURCE_README="$SOURCE_ROOT/README.md"

TARGET_PLANCKATRON="$TARGET/.planckatron"
TARGET_CLAUDE_MD="$TARGET/CLAUDE.md"
TARGET_README="$TARGET/README.md"

# Header
echo ""
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo -e "${ACCENT_BOLD}  PLANCKATRON DEPLOYMENT SYSTEM${RESET}"
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo ""

# Validate Source
echo -e "${TEXT}Scanning source installation...${RESET}"
echo ""

if [ ! -d "$SOURCE_PLANCKATRON" ]; then
    write_status "ERROR" "Source .planckatron directory not found"
    echo -e "${MUTED}  Expected: $SOURCE_PLANCKATRON${RESET}"
    exit 1
fi

if [ ! -f "$SOURCE_CLAUDE_MD" ]; then
    write_status "ERROR" "Source CLAUDE.md not found"
    echo -e "${MUTED}  Expected: $SOURCE_CLAUDE_MD${RESET}"
    exit 1
fi

write_status "OK" "Source installation verified"
echo ""

# Validate Target
echo -e "${TEXT}Scanning target directory...${RESET}"
echo ""

if [ ! -d "$TARGET" ]; then
    echo -e "${WARN}Target directory does not exist: $TARGET${RESET}"
    read -p "Create it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "$TARGET"
        if [ $? -eq 0 ]; then
            write_status "OK" "Target directory created"
        else
            write_status "ERROR" "Failed to create target directory"
            exit 1
        fi
    else
        echo -e "${WARN}Deployment aborted.${RESET}"
        exit 0
    fi
fi

# Check for existing installation
if [ -d "$TARGET_PLANCKATRON" ] || [ -f "$TARGET_CLAUDE_MD" ]; then
    if [ "$FORCE" = false ]; then
        echo -e "${WARN}Existing installation detected!${RESET}"
        read -p "Overwrite existing installation? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${WARN}Deployment aborted.${RESET}"
            exit 0
        fi
    fi

    rm -rf "$TARGET_PLANCKATRON"
    rm -f "$TARGET_CLAUDE_MD"
    write_status "INFO" "Previous installation purged"
    echo ""
fi

# Install
echo -e "${TEXT}Deploying Planckatron...${RESET}"
echo ""

SUCCESS_FLAG=true

# Copy .planckatron
cp -r "$SOURCE_PLANCKATRON" "$TARGET_PLANCKATRON"
if [ $? -eq 0 ]; then
    write_status "COPY" ".planckatron/ -> $TARGET_PLANCKATRON"
else
    write_status "ERROR" "Failed to copy .planckatron"
    SUCCESS_FLAG=false
fi

# Copy CLAUDE.md
cp "$SOURCE_CLAUDE_MD" "$TARGET_CLAUDE_MD"
if [ $? -eq 0 ]; then
    write_status "COPY" "CLAUDE.md -> $TARGET_CLAUDE_MD"
else
    write_status "ERROR" "Failed to copy CLAUDE.md"
    SUCCESS_FLAG=false
fi

# Copy README if requested
if [ "$INCLUDE_README" = true ]; then
    if [ -f "$SOURCE_README" ]; then
        cp "$SOURCE_README" "$TARGET_README"
        write_status "COPY" "README.md -> $TARGET_README"
    else
        write_status "SKIP" "README.md not found in source"
    fi
fi

echo ""

# Result
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo -e "${ACCENT_BOLD}  DEPLOYMENT COMPLETE${RESET}"
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo ""

if [ "$SUCCESS_FLAG" = true ]; then
    echo -e "${SUCCESS}  SYSTEM ACCESS GRANTED${RESET}"
    echo -e "${TEXT}  Planckatron is now ${BOLD_RED}ONLINE${RESET}"
    echo ""
    echo -e "${MUTED}  Target: $TARGET${RESET}"
    echo ""
    echo -e "${ACCENT}  NEXT STEPS:${RESET}"
    echo -e "${TEXT}  1. Open the project in Claude Code${RESET}"
    echo -e "${TEXT}  2. Say 'Planckatron' to activate${RESET}"
    echo ""
    exit 0
else
    echo -e "${RED}  DEPLOYMENT FAILED${RESET}"
    echo -e "${RED}  Review errors above.${RESET}"
    exit 1
fi
