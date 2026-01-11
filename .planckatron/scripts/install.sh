#!/bin/bash

# SYNOPSIS
#   Installs Planckatron to a target project.
# DESCRIPTION
#   Copies the Planckatron orchestration system to a target project directory.
# EXAMPLE
#   ./install.sh --target /path/to/project

# ANSI Color Codes
CYAN='\033[0;36m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[1;30m'
WHITE='\033[1;37m'
RESET='\033[0m'

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
        "OK")    color=$GREEN; symbol="[OK]";;
        "ERROR") color=$RED; symbol="[ERROR]";;
        "COPY")  color=$CYAN; symbol="[COPY]";;
        "SKIP")  color=$YELLOW; symbol="[SKIP]";;
        "INFO")  color=$GRAY; symbol="[INFO]";;
    esac

    echo -e "${color}${symbol} ${RESET}${message}"
}

show_help() {
    echo "Usage: ./install.sh --target <path> [options]"
    echo ""
    echo "Options:"
    echo "  --target <path>    Target project directory (Required)"
    echo "  --include-readme   Copy README.md file"
    echo "  --force            Overwrite existing installation"
    echo "  --help             Show this help message"
    echo ""
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --target) TARGET="$2"; shift ;;
        --include-readme) INCLUDE_README=true ;;
        --force) FORCE=true ;;
        --help) show_help; exit 0 ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$TARGET" ]; then
    echo -e "${RED}ERROR: Target directory is required.${RESET}"
    echo -e "${YELLOW}Usage: ./install.sh --target \"/path/to/project\"${RESET}"
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
echo -e "${CYAN}============================================${RESET}"
echo -e "${CYAN}  Planckatron Installer${RESET}"
echo -e "${CYAN}============================================${RESET}"
echo ""

# Validate Source
echo -e "${WHITE}Validating source installation...${RESET}"
echo ""

if [ ! -d "$SOURCE_PLANCKATRON" ]; then
    write_status "ERROR" "Source .planckatron directory not found"
    echo -e "${GRAY}  Expected: $SOURCE_PLANCKATRON${RESET}"
    exit 1
fi

if [ ! -f "$SOURCE_CLAUDE_MD" ]; then
    write_status "ERROR" "Source CLAUDE.md not found"
    echo -e "${GRAY}  Expected: $SOURCE_CLAUDE_MD${RESET}"
    exit 1
fi

write_status "OK" "Source installation valid"
echo ""

# Validate Target
echo -e "${WHITE}Validating target directory...${RESET}"
echo ""

if [ ! -d "$TARGET" ]; then
    echo -e "${YELLOW}Target directory does not exist: $TARGET${RESET}"
    read -p "Create it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "$TARGET"
        if [ $? -eq 0 ]; then
            write_status "OK" "Created target directory"
        else
            write_status "ERROR" "Failed to create target directory"
            exit 1
        fi
    else
        echo -e "${YELLOW}Installation cancelled.${RESET}"
        exit 0
    fi
fi

# Check for existing installation
if [ -d "$TARGET_PLANCKATRON" ] || [ -f "$TARGET_CLAUDE_MD" ]; then
    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}Existing Planckatron installation detected!${RESET}"
        read -p "Overwrite existing installation? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Installation cancelled.${RESET}"
            exit 0
        fi
    fi
    
    rm -rf "$TARGET_PLANCKATRON"
    rm -f "$TARGET_CLAUDE_MD"
    write_status "INFO" "Removed existing installation"
    echo ""
fi

# Install
echo -e "${WHITE}Installing Planckatron...${RESET}"
echo ""

SUCCESS=true

# Copy .planckatron
cp -r "$SOURCE_PLANCKATRON" "$TARGET_PLANCKATRON"
if [ $? -eq 0 ]; then
    write_status "COPY" ".planckatron/ -> $TARGET_PLANCKATRON"
else
    write_status "ERROR" "Failed to copy .planckatron"
    SUCCESS=false
fi

# Copy CLAUDE.md
cp "$SOURCE_CLAUDE_MD" "$TARGET_CLAUDE_MD"
if [ $? -eq 0 ]; then
    write_status "COPY" "CLAUDE.md -> $TARGET_CLAUDE_MD"
else
    write_status "ERROR" "Failed to copy CLAUDE.md"
    SUCCESS=false
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
echo -e "${CYAN}============================================${RESET}"
echo -e "${CYAN}  Installation Complete${RESET}"
echo -e "${CYAN}============================================${RESET}"
echo ""

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}  Planckatron has been installed successfully!${RESET}"
    echo ""
    echo -e "${WHITE}  Target: $TARGET${RESET}"
    echo ""
    echo -e "${CYAN}  NEXT STEPS:${RESET}"
    echo -e "${WHITE}  1. Open the project in Claude Code${RESET}"
    echo -e "${WHITE}  2. Say 'Planckatron' to activate${RESET}"
    echo ""
    exit 0
else
    echo -e "${RED}  Installation completed with errors.${RESET}"
    exit 1
fi