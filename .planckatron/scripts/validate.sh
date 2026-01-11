#!/bin/bash

# SYNOPSIS
#   Validates Planckatron installation files.
# DESCRIPTION
#   Checks that all required Planckatron files exist and are valid.

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

ERROR_COUNT=0
WARN_COUNT=0

# Determine paths
# Assuming script is in .planckatron/scripts/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLANCKATRON_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$PLANCKATRON_DIR")"

# Helper: Print Status
write_status() {
    local status=$1
    local message=$2
    local details=$3
    local color=$WHITE
    local symbol="[?]"

    case $status in
        "OK")    color=$SUCCESS; symbol="[LOCKED]";;
        "ERROR") color=$RED; symbol="[BREACH]";;
        "WARN")  color=$WARN; symbol="[ALERT]";;
        "INFO")  color=$ACCENT; symbol="[SCAN]";;
    esac

    echo -e "${color}${symbol} ${RESET}${message}"
    if [ ! -z "$details" ]; then
        echo -e "${MUTED}     $details${RESET}"
    fi
}

# Helper: Test JSON using Node.js
test_json_file() {
    local file=$1
    shift
    local keys=("$@")

    # Use Node to parse JSON and check keys
    node -e "
        const fs = require('fs');
        try {
            const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
            const required = [${keys[@]/%/,}]; // format as JS array
            const missing = required.filter(k => !Object.keys(data).includes(k));

            if (missing.length > 0) {
                console.log('MISSING:' + missing.join(', '));
                process.exit(1);
            }
            if (data.version) console.log('VERSION:' + data.version);
        } catch (e) {
            console.log('ERROR:' + e.message);
            process.exit(1);
        }
    " 2> /dev/null
}

# Helper: Test Content using grep
test_file_content() {
    local file=$1
    shift
    local required=("$@")

    local missing_terms=()
    for term in "${required[@]}"; do
        if ! grep -Fq "$term" "$file"; then
            missing_terms+=("$term")
        fi
    done

    if [ ${#missing_terms[@]} -gt 0 ]; then
        echo "${missing_terms[*]}"
        return 1
    fi
    return 0
}

# Header
echo ""
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo -e "${ACCENT_BOLD}  PLANCKATRON SYSTEM DIAGNOSTIC${RESET}"
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo ""
echo -e "${MUTED}Project Root: $PROJECT_ROOT${RESET}"
echo -e "${MUTED}Planckatron Dir: $PLANCKATRON_DIR${RESET}"
echo ""

# --- CHECK 1: SKILL.md ---
FILE="$PLANCKATRON_DIR/SKILL.md"
echo -e "${TEXT}Scanning SKILL.md...${RESET}"
if [ -f "$FILE" ]; then
    write_status "OK" "SKILL.md exists"
    MISSING=$(test_file_content "$FILE" "Planckatron" "ALPHA" "BETA" "GAMMA")
    if [ $? -eq 0 ]; then
        write_status "OK" "Content validation passed"
    else
        write_status "ERROR" "Missing content" "$MISSING"
        ((ERROR_COUNT++))
    fi
else
    write_status "ERROR" "SKILL.md not found" "$FILE"
    ((ERROR_COUNT++))
fi
echo ""

# --- CHECK 2: config.json ---
FILE="$PLANCKATRON_DIR/config.json"
echo -e "${TEXT}Scanning config.json...${RESET}"
if [ -f "$FILE" ]; then
    write_status "OK" "config.json exists"
    # Note: passing keys as strings usually requires quoting in bash for the JS injection above
    # Simplified here for standard keys
    OUTPUT=$(test_json_file "$FILE" "'name'" "'version'" "'orchestration'")
    if [ $? -eq 0 ]; then
        write_status "OK" "Valid JSON structure"
        if [[ $OUTPUT == VERSION:* ]]; then
            write_status "INFO" "Version: ${OUTPUT#VERSION:}"
        fi
    else
        write_status "ERROR" "Invalid JSON or missing keys" "${OUTPUT#ERROR:}"
        ((ERROR_COUNT++))
    fi
else
    write_status "ERROR" "config.json not found" "$FILE"
    ((ERROR_COUNT++))
fi
echo ""

# --- CHECK 3: project-types.json ---
FILE="$PLANCKATRON_DIR/project-types.json"
echo -e "${TEXT}Scanning project-types.json...${RESET}"
if [ -f "$FILE" ]; then
    write_status "OK" "project-types.json exists"
    OUTPUT=$(test_json_file "$FILE")
    if [ $? -eq 0 ]; then
        write_status "OK" "Valid JSON structure"
    else
        write_status "ERROR" "Invalid JSON" "${OUTPUT#ERROR:}"
        ((ERROR_COUNT++))
    fi
else
    write_status "ERROR" "project-types.json not found" "$FILE"
    ((ERROR_COUNT++))
fi
echo ""

# --- CHECK 4: CLAUDE.md ---
FILE="$PROJECT_ROOT/CLAUDE.md"
echo -e "${TEXT}Scanning CLAUDE.md...${RESET}"
if [ -f "$FILE" ]; then
    write_status "OK" "CLAUDE.md exists"
    MISSING=$(test_file_content "$FILE" "Planckatron")
    if [ $? -eq 0 ]; then
        write_status "OK" "Content validation passed"
    else
        write_status "ERROR" "Missing content" "$MISSING"
        ((ERROR_COUNT++))
    fi
else
    write_status "ERROR" "CLAUDE.md not found in root" "$FILE"
    ((ERROR_COUNT++))
fi
echo ""

# --- CHECK 5: Templates ---
echo -e "${TEXT}Scanning template files...${RESET}"
TEMPLATE_DIR="$PLANCKATRON_DIR/templates"
# Removed 'orchestrator-prompt.md' from this list as it is now deprecated
REQUIRED=("worker-alpha.md" "worker-beta.md" "worker-gamma.md")

if [ -d "$TEMPLATE_DIR" ]; then
    for template in "${REQUIRED[@]}"; do
        if [ -f "$TEMPLATE_DIR/$template" ]; then
            write_status "OK" "Template: $template"
        else
            write_status "WARN" "Missing template: $template"
            ((WARN_COUNT++))
        fi
    done
else
    write_status "WARN" "Templates directory not found"
    ((WARN_COUNT++))
fi
echo ""

# --- SUMMARY ---
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo -e "${ACCENT_BOLD}  DIAGNOSTIC COMPLETE${RESET}"
echo -e "${ACCENT_BOLD}══════════════════════════════════════════════${RESET}"
echo ""

if [ $ERROR_COUNT -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
    echo -e "${SUCCESS}  Status: ALL SYSTEMS ONLINE${RESET}"
    echo -e "${SUCCESS}  Planckatron installation is ${BOLD_RED}LOCKED${RESET}"
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${WARN}  Status: OPERATIONAL WITH WARNINGS${RESET}"
    echo -e "${SUCCESS}  Errors:   0${RESET}"
    echo -e "${WARN}  Warnings: $WARN_COUNT${RESET}"
    exit 0
else
    echo -e "${RED}  Status: SYSTEM BREACH DETECTED${RESET}"
    echo -e "${RED}  Errors:   $ERROR_COUNT${RESET}"
    echo -e "${WARN}  Warnings: $WARN_COUNT${RESET}"
    echo ""
    echo -e "${RED}  Fix errors before activating Planckatron.${RESET}"
    exit 1
fi
