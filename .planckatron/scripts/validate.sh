#!/bin/bash

# SYNOPSIS
#   Validates Planckatron installation files.
# DESCRIPTION
#   Checks that all required Planckatron files exist and are valid.

# ANSI Color Codes
CYAN='\033[0;36m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[1;30m'
WHITE='\033[1;37m'
RESET='\033[0m'

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
        "OK")    color=$GREEN; symbol="[OK]";;
        "ERROR") color=$RED; symbol="[ERROR]";;
        "WARN")  color=$YELLOW; symbol="[WARN]";;
        "INFO")  color=$CYAN; symbol="[INFO]";;
    esac

    echo -e "${color}${symbol} ${RESET}${message}"
    if [ ! -z "$details" ]; then
        echo -e "${GRAY}     $details${RESET}"
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
echo -e "${CYAN}============================================${RESET}"
echo -e "${CYAN}  Planckatron Validation${RESET}"
echo -e "${CYAN}============================================${RESET}"
echo ""
echo -e "${GRAY}Project Root: $PROJECT_ROOT${RESET}"
echo -e "${GRAY}Planckatron Dir: $PLANCKATRON_DIR${RESET}"
echo ""

# --- CHECK 1: SKILL.md ---
FILE="$PLANCKATRON_DIR/SKILL.md"
echo -e "${WHITE}Checking SKILL.md...${RESET}"
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
echo -e "${WHITE}Checking config.json...${RESET}"
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
echo -e "${WHITE}Checking project-types.json...${RESET}"
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
echo -e "${WHITE}Checking CLAUDE.md...${RESET}"
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
echo -e "${WHITE}Checking template files...${RESET}"
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
echo -e "${CYAN}============================================${RESET}"
echo -e "${CYAN}  Validation Summary${RESET}"
echo -e "${CYAN}============================================${RESET}"
echo ""

if [ $ERROR_COUNT -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
    echo -e "${GREEN}  Status: ALL CHECKS PASSED${RESET}"
    echo -e "${GREEN}  Planckatron installation is valid.${RESET}"
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}  Status: PASSED WITH WARNINGS${RESET}"
    echo -e "${GREEN}  Errors:   0${RESET}"
    echo -e "${YELLOW}  Warnings: $WARN_COUNT${RESET}"
    exit 0
else
    echo -e "${RED}  Status: VALIDATION FAILED${RESET}"
    echo -e "${RED}  Errors:   $ERROR_COUNT${RESET}"
    echo -e "${YELLOW}  Warnings: $WARN_COUNT${RESET}"
    echo ""
    echo -e "${RED}  Please fix the errors above before using Planckatron.${RESET}"
    exit 1
fi