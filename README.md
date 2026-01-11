# Planckatron

[![Version](https://img.shields.io/badge/version-3.0.0-purple?style=for-the-badge)](https://github.com/AgriciDaniel/planckatron-claude-code)
[![Status](https://img.shields.io/badge/status-HARDENED-red?style=for-the-badge)](https://github.com/AgriciDaniel/planckatron-claude-code)
[![Agents](https://img.shields.io/badge/agents-CONTAINED-darkred?style=for-the-badge)](https://github.com/AgriciDaniel/planckatron-claude-code)
[![Safety](https://img.shields.io/badge/bad%20robots-BLOCKED-black?style=for-the-badge&labelColor=purple)](https://github.com/AgriciDaniel/planckatron-claude-code)

```
                       ·  *  ·
                        ▌▐▌▐
                   ██████████████
                 ██   ▓▓▓▓▓▓▓   ██
                 █  ░░░░  ░░░░  █
                 ██     ◉◉     ██
                   ██████████████
                      ║    ║
                   ╔══╩════╩══╗
                   ║ HARDENED ║
                   ╚══════════╝

           ╔══════════════════════════╗
           ║    P L A N C K A T R O N ║
           ║  Quantum Agentic System  ║
           ║      ⚠ BAD ROBOT ⚠       ║
           ╚══════════════════════════╝
```

**Hierarchical Multi-Agent Orchestration System (v3.0 - Hardened)**

Build ANY project faster with parallel AI agents that **can't go rogue**.

---

## What's New in v3.0 "Hardening"

```
+----------------------+---------------------------------------------+
|       FEATURE        |               DESCRIPTION                   |
+----------------------+---------------------------------------------+
| 🚨 Zone Police       | Strict file ownership enforcement           |
| ⏱️  Watchdog          | 120s timeout with auto-kill                 |
| ↩️  Rollback          | One-click undo for failed agents            |
| 🧠 Persistent Memory | Crash recovery & session resume             |
| 🔒 Containment       | Bad robots can't escape their zones         |
+----------------------+---------------------------------------------+
```

---

## Safety Systems

### 🚨 Zone Police — "The Block"

Every agent is **locked to their zone**. ALPHA can't touch BETA's files. GAMMA can't touch ALPHA's files. Period.

```
ZONE ENFORCEMENT:

    GAMMA wants server.js?
           |
           v
    +-------------+
    | validate-   |
    | zone.js     |
    +------+------+
           |
           v
    +-------------+
    |   DENIED    |  ← Exit Code 1
    | "Not your   |
    |   zone!"    |
    +-------------+

    Result: File NOT created. Bad robot contained.
```

**How it works:**
- Before ANY file write, agents MUST call `validate-zone.js`
- Exit code `0` = ALLOWED (proceed)
- Exit code `1` = DENIED (blocked)
- Exit code `2` = ERROR (invalid args)

```bash
# Manual zone check
node .planckatron/scripts/validate-zone.js --agent gamma --file "server.js"
```

**Output when blocked:**
```json
{
  "status": "DENIED",
  "agent": "GAMMA",
  "file": "server.js",
  "reason": "NOT_IN_OWNED_ZONE",
  "suggestion": "Request delegation to the correct agent."
}
```

---

### ⏱️ Watchdog — "The Kill"

Runaway processes get **terminated**. Default timeout: 120 seconds. No infinite loops allowed.

```
WATCHDOG FLOW:

    Agent starts long task
           |
           v
    +-------------+
    | run-with-   |
    | timeout.js  |
    +------+------+
           |
    [120 seconds pass...]
           |
           v
    +-------------+
    |   TIMEOUT   |  ← Exit Code 124
    |  Process    |
    |   KILLED    |
    +-------------+

    Result: Hung process terminated. System recovers.
```

**How it works:**
- Wraps any command with a timeout
- Kills process tree on timeout
- Returns JSON status report

```bash
# Run with 60-second timeout
node .planckatron/scripts/run-with-timeout.js --timeout 60 -- npm run build

# Default 120-second timeout
node .planckatron/scripts/run-with-timeout.js -- npm install
```

**Output on timeout:**
```json
{
  "status": "TIMEOUT",
  "timeout_seconds": 120,
  "elapsed_seconds": 120,
  "command": "npm install",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### ↩️ Rollback — "The Undo"

When agents fail, **clean up the mess**. One command removes all files created by a failed agent.

```
ROLLBACK FLOW:

    BETA crashes mid-task
           |
           v
    +-------------+
    | rollback.js |
    | --agent beta|
    +------+------+
           |
           v
    +-------------+
    | Scan file   |
    | registry    |
    +------+------+
           |
           v
    +-------------+
    | DELETE all  |
    | BETA files  |
    +-------------+

    Result: Workspace restored. Ready to retry.
```

**How it works:**
- Reads file registry from memory
- Identifies files created by specific agent
- Deletes them (with dry-run option)

```bash
# Rollback BETA's files from session
node .planckatron/scripts/rollback.js --agent beta --session task-123

# Preview what would be deleted
node .planckatron/scripts/rollback.js --dry-run --agent beta --session task-123

# Rollback entire session
node .planckatron/scripts/rollback.js --session task-123
```

---

## Architecture

```
              ORCHESTRATOR (Claude)
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
   +-------+     +-------+     +-------+
   | ALPHA |     | BETA  |     | GAMMA |
   | Lead  |     | Lead  |     | Lead  |
   +---+---+     +---+---+     +---+---+
       |             |             |
    +--+--+       +--+--+       +--+--+
    |a1|a2|       |b1|b2|       |g1|g2|
    +--+--+       +--+--+       +--+--+
     mini          mini          mini
    agents        agents        agents

    ════════════════════════════════════
           SAFETY LAYER (v3.0)
    ════════════════════════════════════
    │ Zone Police │ Watchdog │ Rollback │
    ════════════════════════════════════
```

**Key:** Team Leads spawn mini-agents. Safety layer catches bad behavior.

---

## Zone Assignments

```
+-------------+------------------+------------------+------------------+
|    TYPE     |      ALPHA       |       BETA       |      GAMMA       |
+-------------+------------------+------------------+------------------+
| frontend    | layout, styles   | components       | pages            |
| backend     | models, schemas  | services, utils  | routes, ctrl     |
| fullstack   | api, server      | components       | pages            |
| automation  | scripts, core    | utils, config    | cli, entry       |
| agentic     | agents, memory   | tools, prompts   | orchestrator     |
| library     | core, lib        | types, utils     | exports          |
| monorepo    | packages/shared  | packages/ui      | apps/**          |
+-------------+------------------+------------------+------------------+

⚠️  CROSS-ZONE WRITES = DENIED
```

---

## Quick Start

### Installation

```bash
# Clone the repo
git clone https://github.com/AgriciDaniel/planckatron-claude-code.git

# Run the installer
cd planckatron-claude-code
./.planckatron/scripts/install.sh
```

### Activation

```bash
# Show the splash screen
./planckatron.sh
```

Or in Claude Code, just say:

```
Planckatron
```

### Workflow

```
+-------------------------+
|   "./planckatron.sh"    |
|   or say "Planckatron"  |
+------------+------------+
             |
             v
+-------------------------+
|   Splash screen shows   |
|   Describe your feature |
+------------+------------+
             |
             v
+-------------------------+
|   Visual plan created   |
|   Approve to execute    |
+------------+------------+
             |
             v
+-------------------------+
|   3 Team Leads spawn    |
|   (Zone-locked)         |
+------------+------------+
             |
             v
+-------------------------+
|   Progress board shows  |
|   Safety systems active |
+------------+------------+
             |
             v
+-------------------------+
|   Complete!             |
|   Quality checks pass   |
+-------------------------+
```

---

## Visual Planning

```
+==============================================================+
|                    QUANTUM PLAN v3.0                         |
+==============================================================+
|  Request: "Build user authentication"                        |
|  Type: backend            Stack: Node.js + Express           |
|  Safety: ZONE POLICE ACTIVE                                  |
+==============================================================+

REQUEST: "Build user auth"
              |
              v
+-------------+-------------+-------------+
|             |             |             |
v             v             v             v
+--------+  +--------+  +--------+
| ALPHA  |  |  BETA  |  | GAMMA  |
| models |  | service|  | routes |
| 🔒     |  | 🔒     |  | 🔒     |
+--------+  +--------+  +--------+
    |           |           |
    v           v           v
 [a-1,a-2]   [b-1]      [g-1,g-2]

+==============================================================+
|  Mode: PARALLEL    Agents: 8    Safety: HARDENED             |
+==============================================================+
```

---

## Progress Boards

```
+------------------+------------------+------------------+
|      ALPHA       |       BETA       |      GAMMA       |
+------------------+------------------+------------------+
| Status: WORKING  | Status: WORKING  | Status: PENDING  |
| Zone: 🔒 LOCKED  | Zone: 🔒 LOCKED  | Zone: 🔒 LOCKED  |
+------------------+------------------+------------------+
| [*] models/user  | [*] userService  | [ ] routes/user  |
| [*] models/post  | [ ] postService  | [ ] routes/post  |
| [ ] schemas      | [ ] middleware   | [ ] controllers  |
+------------------+------------------+------------------+
| Mini-agents: 2   | Mini-agents: 1   | Mini-agents: 0   |
+------------------+------------------+------------------+

Progress: [=========>          ] 45%
Safety:   [████████████████████] 100% ACTIVE
```

---

## Commands

```
+----------------------------------+--------------------------------+
|           COMMAND                |          DESCRIPTION           |
+----------------------------------+--------------------------------+
| Planckatron                      | Start (auto-detect type)       |
| Planckatron backend              | Start with backend type        |
| Planckatron frontend             | Start with frontend type       |
| Planckatron fullstack            | Start with fullstack type      |
| Planckatron status               | Show current progress          |
| Planckatron resume               | Resume interrupted build       |
| Planckatron memory               | Show memory summary            |
+----------------------------------+--------------------------------+
```

---

## Script Reference

```
+----------------------------------------+----------------------------------+
|              SCRIPT                    |           PURPOSE                |
+----------------------------------------+----------------------------------+
| ./planckatron.sh                       | Display splash, start system     |
| ./.planckatron/scripts/install.sh      | Install dependencies             |
| ./.planckatron/scripts/init-memory.js  | Initialize/read memory           |
| ./.planckatron/scripts/validate-zone.js| Check file zone ownership        |
| ./.planckatron/scripts/run-with-timeout.js | Execute with timeout         |
| ./.planckatron/scripts/rollback.js     | Undo failed agent's work         |
| ./.planckatron/scripts/update-registry.js | Update memory registry        |
+----------------------------------------+----------------------------------+
```

---

## Directory Structure

```
your-project/
├── .planckatron/
│   ├── SKILL.md              # v3.0 skill definition
│   ├── config.json           # Zone configurations
│   ├── project-types.json    # Type definitions
│   ├── state/
│   │   └── project-memory.json  # Persistent memory
│   ├── scripts/
│   │   ├── init-memory.js    # Memory system
│   │   ├── validate-zone.js  # 🚨 Zone Police
│   │   ├── run-with-timeout.js # ⏱️ Watchdog
│   │   ├── rollback.js       # ↩️ Rollback
│   │   └── update-registry.js # Registry updates
│   └── templates/
│       ├── worker-alpha.md   # ALPHA template
│       ├── worker-beta.md    # BETA template
│       └── worker-gamma.md   # GAMMA template
│
├── CLAUDE.md                 # Activation trigger
└── planckatron.sh            # Launch script
```

---

## Requirements

- Claude Code CLI or VS Code extension
- Node.js 18+ (for scripts and quality checks)
- macOS, Linux, or WSL (for shell scripts)

---

## Version History

```
+----------+----------------------------------+
| VERSION  |            FEATURES              |
+----------+----------------------------------+
| v3.0.0   | 🚨 Zone Police, ⏱️ Watchdog,     |
|          | ↩️ Rollback, Bad Robot Hardening  |
+----------+----------------------------------+
| v2.3.0   | Persistent Memory System         |
+----------+----------------------------------+
| v2.2.0   | Hierarchical + Visual            |
+----------+----------------------------------+
| v2.1.0   | Universal Edition                |
+----------+----------------------------------+
| v2.0.0   | Frontend Edition                 |
+----------+----------------------------------+
```

---

## Crash & Containment Test

Run this to verify all safety systems:

```bash
# 1. Initialize memory
node .planckatron/scripts/init-memory.js

# 2. Test Zone Police (should return DENIED)
node .planckatron/scripts/validate-zone.js --agent gamma --file "server.js"

# 3. Test Watchdog (should kill after 2s)
node .planckatron/scripts/run-with-timeout.js --timeout 2 -- sleep 5

# 4. Test Rollback
node .planckatron/scripts/rollback.js --agent beta --session test-001
```

**Expected Results:**
- Zone Police: Exit code `1` (DENIED)
- Watchdog: Exit code `124` (TIMEOUT)
- Rollback: Scans and reports

---

## License

MIT

---

## Credits

Created by Daniel Agrici

```
+==================================================+
|                                                  |
|   "More agents, more speed, ZERO rogue robots."  |
|                                                  |
|              - Planckatron v3.0                  |
|                   HARDENED                       |
|                                                  |
+==================================================+
```

[![Bad Robot](https://img.shields.io/badge/🤖_BAD_ROBOTS-CONTAINED-red?style=for-the-badge&labelColor=black)](https://github.com/AgriciDaniel/planckatron-claude-code)

**GitHub:** https://github.com/AgriciDaniel/planckatron-claude-code
