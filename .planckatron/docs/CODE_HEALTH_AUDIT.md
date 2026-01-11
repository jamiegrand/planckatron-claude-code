# Planckatron Code Health & Logic Audit

**Date:** 2026-01-11
**Auditor:** Senior Lead Architect
**Version Audited:** 2.2.0 / 2.3.0 (version mismatch noted)

---

## Executive Summary

This audit analyzed the core configuration and template files in `.planckatron/` and root directory, focusing on three pillars: Prompt Logic & Token Efficiency, Configuration Robustness, and Error Handling & Resilience.

**Key Findings:**
- Prompt redundancy causing ~12K token overhead per execution
- Detection patterns are prose descriptions, not functional regex/globs
- No enforcement mechanism for zone ownership
- Missing error handling for agent timeouts and failures
- Broken design token parsing in `update-registry.js`

---

## 1. PROMPT LOGIC & TOKEN EFFICIENCY ("Soft" Code)

### Findings:

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| **Prompt Redundancy** | MEDIUM | `orchestrator-prompt.md` vs `SKILL.md` | Two separate prompt files with overlapping content (~60% duplicate). SKILL.md is 636 lines, orchestrator-prompt.md is 245 lines. Token waste. |
| **Template Variable Placeholders** | LOW | `worker-*.md` | Uses `{{VARIABLE}}` syntax but no substitution engine exists. Workers receive raw `{{DESIGN_TOKENS}}` strings if not manually replaced. |
| **Verbose Zone Definitions** | MEDIUM | All worker templates | Zones defined in prose AND code blocks. Should be structured JSON for parsing, not markdown. |
| **Forbidden Zone Weakness** | HIGH | `worker-alpha.md:40-44` | Forbidden zone is defined as "CANNOT touch" but there's no enforcement mechanism. Agents can still modify files outside their zone. |
| **Missing JSON Schema** | HIGH | All templates | No strict JSON output format defined for agent completion reports. Orchestrator parses free-form text, risking extraction failures. |

### Token Efficiency Metrics:

```
+---------------------------+--------+-------------+
| File                      | Lines  | Est. Tokens |
+---------------------------+--------+-------------+
| SKILL.md                  | 636    | ~4,500      |
| orchestrator-prompt.md    | 245    | ~1,800      |
| worker-alpha.md           | 258    | ~1,600      |
| worker-beta.md            | 336    | ~2,100      |
| worker-gamma.md           | 329    | ~2,000      |
+---------------------------+--------+-------------+
| TOTAL PER EXECUTION       |        | ~12,000     |
+---------------------------+--------+-------------+
```

**Problem:** If all templates are sent to agents, that's ~12K tokens of instructions before any actual work begins.

---

## 2. CONFIGURATION ROBUSTNESS ("Hard" Code)

### Findings in `project-types.json`:

| Issue | Severity | Description |
|-------|----------|-------------|
| **Pseudo-Regex Detection** | HIGH | `detectPatterns` are not real regex - they're prose descriptions like `"package.json with react/vue/svelte"`. No actual parsing logic exists. |
| **Missing Python/FastAPI** | MEDIUM | No `python` project type despite being a common stack. |
| **Missing Go** | MEDIUM | No `go` project type for backend services. |
| **Missing Rust** | LOW | No `rust` project type. |
| **Version Mismatch** | LOW | `project-types.json` says version `2.1.0`, `config.json` says `2.2.0`, `SKILL.md` header says `2.3.0`. |

### Detection Pattern Analysis:

```javascript
// Current (non-functional):
"detectPatterns": ["package.json with react/vue/svelte", "src/components/**"]

// Should be (actual globs/regex):
"detectPatterns": {
  "files": ["package.json"],
  "contentMatch": ["\"react\":", "\"vue\":", "\"svelte\":"],
  "directories": ["src/components", "src/app"]
}
```

### `config.json` Gaps:

| Issue | Severity | Description |
|-------|----------|-------------|
| **No Parallel Mode** | MEDIUM | `orchestration.mode` is `"sequential"` only. The system claims parallel execution but config doesn't reflect it. |
| **Quality Gates Disabled** | LOW | `lint` and `test` are disabled by default. Should prompt to enable. |
| **No Agent Model Config** | MEDIUM | No way to specify which Claude model (haiku/sonnet/opus) for different agent tiers. Mini-agents should use haiku for cost efficiency. |

---

## 3. ERROR HANDLING & RESILIENCE

### Findings:

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| **No Agent Timeout Handling** | HIGH | SKILL.md | If ALPHA hangs, BETA/GAMMA wait forever. No watchdog. |
| **Retry Logic is Prose Only** | HIGH | SKILL.md:489-505 | The retry flow diagram exists but no actual implementation. It's documentation, not code. |
| **Checkpoint Incomplete** | MEDIUM | `update-registry.js:182-192` | Checkpoints track status but don't store partial file lists. If BETA crashes mid-way, we can't tell which files were created. |
| **No Rollback Mechanism** | HIGH | All scripts | If GAMMA fails after ALPHA+BETA succeed, there's no way to undo their changes. |
| **Silent Failures** | MEDIUM | `update-registry.js:274` | `set-design-token` parsing is fragile - it grabs "next non-flag argument" which can fail silently. |

### Memory Script Issues:

```javascript
// update-registry.js:274 - This is broken:
if (args['set-design-token']) {
  setDesignToken(memory, args['set-design-token'],
    args[Object.keys(args).find(k => !k.startsWith('set-') && k !== 'set-design-token')]);
}
// Problem: Doesn't correctly find the value argument
```

---

# PRIORITIZED ROADMAP

---

## PHASE 1: Quick Wins (Low Effort / High Impact)

```
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 1: QUICK WINS                                             │
│  Est. Complexity: 1-2 files per item                             │
└──────────────────────────────────────────────────────────────────┘

1.1 VERSION SYNC
    ├── config.json      → Set to 2.3.0
    ├── project-types.json → Set to 2.3.0
    └── SKILL.md         → Already 2.3.0 ✓

1.2 FIX DESIGN TOKEN PARSING
    └── update-registry.js:274
        Current:  args[Object.keys(args).find(...)]  // Broken
        Fixed:    Add explicit --value parameter

1.3 ADD STRUCTURED OUTPUT FORMAT
    └── All worker templates: Add completion JSON schema
        {
          "status": "complete|failed",
          "filesCreated": ["path1", "path2"],
          "filesModified": ["path3"],
          "errors": []
        }

1.4 ENABLE QUALITY GATES BY DEFAULT
    └── config.json: Set lint.enabled = true, test.enabled = true

1.5 CONSOLIDATE PROMPTS
    └── Delete orchestrator-prompt.md (redundant with SKILL.md)
    └── Keep SKILL.md as single source of truth
```

---

## PHASE 2: Architectural Refactoring (Medium Effort)

```
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 2: ARCHITECTURAL REFACTORING                              │
│  Est. Complexity: New files / significant rewrites               │
└──────────────────────────────────────────────────────────────────┘

2.1 REAL DETECTION PATTERNS
    └── project-types.json
        ├── Convert prose patterns to actual globs
        ├── Add package.json dependency scanning
        └── Create detection.js script for auto-detection

2.2 ZONE ENFORCEMENT
    └── Create validate-zone.js
        ├── Input: agent ID + file path
        ├── Output: allowed/forbidden + reason
        └── Call before each file write

2.3 AGENT TIMEOUT & WATCHDOG
    └── SKILL.md + config.json
        ├── Add workerTimeout enforcement
        ├── Define fallback behavior (retry? skip? prompt user?)
        └── Add --timeout flag to agent spawning

2.4 CHECKPOINT ENHANCEMENT
    └── update-registry.js
        ├── Track partial file lists per checkpoint
        ├── Enable "resume from file X" capability
        └── Store agent output snapshots

2.5 ROLLBACK MECHANISM
    └── Create rollback.js
        ├── Store pre-execution file hashes
        ├── On failure: revert to previous state
        └── Or: use git stash/branch approach

2.6 ADD AGENT MODEL TIERS
    └── config.json
        orchestration: {
          models: {
            teamLead: "sonnet",
            miniAgent: "haiku"
          }
        }
```

---

## PHASE 3: Feature Expansion (New Capabilities)

```
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 3: FEATURE EXPANSION                                      │
│  Est. Complexity: New project types, new capabilities            │
└──────────────────────────────────────────────────────────────────┘

3.1 NEW PROJECT TYPES
    └── project-types.json
        ├── python (FastAPI, Django, Flask)
        │   └── ALPHA: models/   BETA: services/   GAMMA: routes/
        ├── go (Gin, Echo, Fiber)
        │   └── ALPHA: models/   BETA: handlers/   GAMMA: cmd/
        └── rust (Axum, Actix)
            └── ALPHA: models/   BETA: services/   GAMMA: main.rs

3.2 PARALLEL EXECUTION MODE
    └── config.json + SKILL.md
        ├── mode: "parallel" option
        ├── Run ALPHA/BETA/GAMMA truly in parallel when zones don't conflict
        └── Add dependency graph for smart scheduling

3.3 INTERACTIVE PROGRESS DASHBOARD
    └── Create status.js
        ├── Real-time terminal UI (blessed/ink)
        ├── Show agent status, files created, errors
        └── Invoke via "Planckatron status"

3.4 PLUGIN SYSTEM
    └── .planckatron/plugins/
        ├── Allow custom project types
        ├── Allow custom quality gates
        └── Allow custom agent behaviors

3.5 TEST GENERATION
    └── Add worker-test.md template
        ├── Spawned after GAMMA completes
        ├── Creates unit tests for all new files
        └── Runs test suite before completion report
```

---

## SUMMARY MATRIX

```
+---------------------------+----------+----------+------------+
|          ITEM             | EFFORT   | IMPACT   | PRIORITY   |
+---------------------------+----------+----------+------------+
| 1.1 Version sync          | LOW      | LOW      | P3         |
| 1.2 Fix token parsing     | LOW      | MEDIUM   | P1         |
| 1.3 Structured output     | LOW      | HIGH     | P1         |
| 1.4 Enable quality gates  | LOW      | MEDIUM   | P2         |
| 1.5 Consolidate prompts   | LOW      | HIGH     | P1         |
+---------------------------+----------+----------+------------+
| 2.1 Real detection        | MEDIUM   | HIGH     | P1         |
| 2.2 Zone enforcement      | MEDIUM   | HIGH     | P1         |
| 2.3 Agent timeout         | MEDIUM   | HIGH     | P1         |
| 2.4 Checkpoint enhance    | MEDIUM   | MEDIUM   | P2         |
| 2.5 Rollback mechanism    | MEDIUM   | HIGH     | P2         |
| 2.6 Agent model tiers     | LOW      | MEDIUM   | P2         |
+---------------------------+----------+----------+------------+
| 3.1 New project types     | MEDIUM   | HIGH     | P2         |
| 3.2 Parallel execution    | HIGH     | HIGH     | P3         |
| 3.3 Progress dashboard    | HIGH     | MEDIUM   | P4         |
| 3.4 Plugin system         | HIGH     | MEDIUM   | P4         |
| 3.5 Test generation       | HIGH     | HIGH     | P3         |
+---------------------------+----------+----------+------------+
```

---

## RECOMMENDED NEXT STEPS

```
TOP 5 ACTIONS (Ordered by ROI):

1. [P1] Fix update-registry.js token parsing bug
   └── Broken code, easy fix, immediate reliability gain

2. [P1] Add structured JSON output to worker templates
   └── Enables reliable parsing of agent results

3. [P1] Create zone enforcement script
   └── Core architectural integrity - prevents file conflicts

4. [P1] Implement agent timeout handling
   └── Prevents hung executions, improves resilience

5. [P1] Delete orchestrator-prompt.md, consolidate to SKILL.md
   └── Reduce token waste, single source of truth
```

---

## Files Audited

- `.planckatron/SKILL.md`
- `.planckatron/config.json`
- `.planckatron/project-types.json`
- `.planckatron/templates/orchestrator-prompt.md`
- `.planckatron/templates/worker-alpha.md`
- `.planckatron/templates/worker-beta.md`
- `.planckatron/templates/worker-gamma.md`
- `.planckatron/templates/design-extractor.md`
- `.planckatron/scripts/init-memory.js`
- `.planckatron/scripts/update-registry.js`
- `.planckatron/scripts/README.md`
- `.planckatron/state/project-memory.json`
- `CLAUDE.md`
