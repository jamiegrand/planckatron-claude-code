#!/usr/bin/env node
/**
 * Planckatron Memory System - Initialization Script
 *
 * This script manages the persistent memory store for Planckatron.
 * It initializes or reads the project-memory.json file and outputs
 * a context summary for the Orchestrator.
 *
 * Usage:
 *   node init-memory.js              # Initialize or read memory
 *   node init-memory.js --summary    # Output summary only
 *   node init-memory.js --reset      # Reset memory to defaults
 *   node init-memory.js --json       # Output raw JSON
 */

const fs = require('fs');
const path = require('path');

// Configuration
const STATE_DIR = path.join(__dirname, '..', 'state');
const MEMORY_FILE = path.join(STATE_DIR, 'project-memory.json');

// Default schema for new projects
const DEFAULT_MEMORY = {
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  projectInfo: {
    type: '',           // frontend, backend, fullstack, etc.
    stack: [],          // ['Next.js', 'TypeScript', 'Tailwind']
    name: '',
    description: '',
    detectedAt: null
  },

  designSystem: {
    colors: {
      bg: { primary: '', secondary: '', tertiary: '' },
      text: { primary: '', secondary: '', muted: '' },
      accent: { primary: '', hover: '' },
      border: { default: '' }
    },
    fonts: {
      primary: '',
      secondary: ''
    },
    spacing: {},
    borderRadius: {}
  },

  componentRegistry: [
    // { name: 'Button', path: 'src/components/ui/Button.tsx', createdBy: 'BETA', version: '1.0', exports: ['Button', 'ButtonProps'] }
  ],

  fileRegistry: [
    // { path: 'src/app/layout.tsx', createdBy: 'ALPHA', purpose: 'Root layout', modifiedAt: '...', sessionId: '...' }
  ],

  architectureDecisions: [
    // { date: '...', decision: '...', rationale: '...', madeBy: 'ORCHESTRATOR' }
  ],

  history: [
    // { taskId: '...', description: '...', status: 'complete', agents: {...}, timestamp: '...' }
  ],

  rollbackHistory: [
    // { timestamp: '...', session: '...', agent: '...', filesDeleted: [...] }
  ],

  currentExecution: null
  // When running: { taskId: '...', phase: 'EXECUTE', status: 'running'|'failed'|'interrupted'|'rolled_back', checkpoint: { alpha: 'complete', beta: 'running', gamma: 'pending' }, createdFiles: [...] }
};

/**
 * Ensure the state directory exists
 */
function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    console.log(`[MEMORY] Created state directory: ${STATE_DIR}`);
  }
}

/**
 * Initialize or load the memory file
 */
function initializeMemory(forceReset = false) {
  ensureStateDir();

  if (fs.existsSync(MEMORY_FILE) && !forceReset) {
    // Load existing memory
    try {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      const memory = JSON.parse(data);
      memory.updatedAt = new Date().toISOString();
      return { isNew: false, memory };
    } catch (error) {
      console.error(`[MEMORY] Error reading memory file: ${error.message}`);
      console.log('[MEMORY] Creating new memory file...');
    }
  }

  // Create new memory
  const memory = { ...DEFAULT_MEMORY };
  memory.createdAt = new Date().toISOString();
  memory.updatedAt = new Date().toISOString();

  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  console.log(`[MEMORY] Initialized new memory file: ${MEMORY_FILE}`);

  return { isNew: true, memory };
}

/**
 * Generate a human-readable summary for the Orchestrator
 */
function generateSummary(memory, isNew) {
  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║              PLANCKATRON MEMORY SYSTEM                       ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  if (isNew) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  STATUS: NEW PROJECT - No prior context found                │');
    lines.push('│  Memory initialized with default schema.                     │');
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push('');
    lines.push('NEXT: Run project detection to populate projectInfo.');
    lines.push('');
  } else {
    // Project Info
    lines.push('┌─ PROJECT INFO ───────────────────────────────────────────────┐');
    if (memory.projectInfo.type) {
      lines.push(`│  Type:  ${memory.projectInfo.type.padEnd(50)}│`);
      lines.push(`│  Stack: ${(memory.projectInfo.stack.join(', ') || 'Not detected').padEnd(50)}│`);
    } else {
      lines.push('│  Type:  Not yet detected                                    │');
    }
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push('');

    // Component Registry
    lines.push('┌─ COMPONENT REGISTRY ─────────────────────────────────────────┐');
    if (memory.componentRegistry.length === 0) {
      lines.push('│  No components registered yet.                               │');
    } else {
      lines.push('│  Name                 │ Path                      │ By      │');
      lines.push('│──────────────────────┼───────────────────────────┼─────────│');
      memory.componentRegistry.slice(0, 10).forEach(comp => {
        const name = (comp.name || '').substring(0, 20).padEnd(20);
        const compPath = (comp.path || '').substring(0, 25).padEnd(25);
        const by = (comp.createdBy || '').substring(0, 7).padEnd(7);
        lines.push(`│  ${name} │ ${compPath} │ ${by} │`);
      });
      if (memory.componentRegistry.length > 10) {
        lines.push(`│  ... and ${memory.componentRegistry.length - 10} more components`.padEnd(63) + '│');
      }
    }
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push('');

    // File Registry Summary
    lines.push('┌─ FILE REGISTRY ──────────────────────────────────────────────┐');
    if (memory.fileRegistry.length === 0) {
      lines.push('│  No files registered yet.                                    │');
    } else {
      const byAgent = {};
      memory.fileRegistry.forEach(f => {
        byAgent[f.createdBy] = (byAgent[f.createdBy] || 0) + 1;
      });
      lines.push(`│  Total files tracked: ${memory.fileRegistry.length}`.padEnd(63) + '│');
      Object.entries(byAgent).forEach(([agent, count]) => {
        lines.push(`│    ${agent}: ${count} files`.padEnd(63) + '│');
      });
    }
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push('');

    // Design System
    if (memory.designSystem.colors.bg.primary) {
      lines.push('┌─ DESIGN SYSTEM ─────────────────────────────────────────────┐');
      lines.push(`│  Primary BG:    ${memory.designSystem.colors.bg.primary}`.padEnd(63) + '│');
      lines.push(`│  Accent:        ${memory.designSystem.colors.accent.primary}`.padEnd(63) + '│');
      lines.push(`│  Font:          ${memory.designSystem.fonts.primary || 'Not set'}`.padEnd(63) + '│');
      lines.push('└──────────────────────────────────────────────────────────────┘');
      lines.push('');
    }

    // Execution History
    lines.push('┌─ EXECUTION HISTORY ──────────────────────────────────────────┐');
    if (memory.history.length === 0) {
      lines.push('│  No prior executions.                                        │');
    } else {
      lines.push(`│  Total tasks completed: ${memory.history.length}`.padEnd(63) + '│');
      const lastTask = memory.history[memory.history.length - 1];
      if (lastTask) {
        lines.push(`│  Last task: ${(lastTask.description || '').substring(0, 48)}`.padEnd(63) + '│');
        lines.push(`│  Status: ${lastTask.status}`.padEnd(63) + '│');
      }
    }
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push('');

    // Current Execution (if any)
    if (memory.currentExecution) {
      lines.push('┌─ ACTIVE EXECUTION ──────────────────────────────────────────┐');
      lines.push(`│  Task: ${memory.currentExecution.taskId}`.padEnd(63) + '│');
      lines.push(`│  Phase: ${memory.currentExecution.phase}`.padEnd(63) + '│');
      if (memory.currentExecution.checkpoint) {
        const cp = memory.currentExecution.checkpoint;
        lines.push(`│  ALPHA: ${cp.alpha || 'pending'}  BETA: ${cp.beta || 'pending'}  GAMMA: ${cp.gamma || 'pending'}`.padEnd(63) + '│');
      }
      lines.push('│                                                              │');
      lines.push('│  ⚠️  INCOMPLETE EXECUTION DETECTED                           │');
      lines.push('│  Use "Planckatron resume" to continue.                       │');
      lines.push('└──────────────────────────────────────────────────────────────┘');
      lines.push('');
    }
  }

  // Instructions for Orchestrator
  lines.push('┌─ ORCHESTRATOR INSTRUCTIONS ────────────────────────────────────┐');
  lines.push('│  1. Check componentRegistry before creating new components     │');
  lines.push('│  2. Pass designSystem tokens to all agents                     │');
  lines.push('│  3. Update memory after each agent completes                   │');
  lines.push('│  4. Save checkpoint before spawning each agent                 │');
  lines.push('└───────────────────────────────────────────────────────────────┘');
  lines.push('');

  return lines.join('\n');
}

/**
 * Check if the last session needs recovery
 * Returns resume info if recovery is possible
 */
function checkForResume(memory) {
  if (!memory.currentExecution) {
    return null;
  }

  const exec = memory.currentExecution;
  const status = exec.status || 'unknown';

  // Check for incomplete/failed/interrupted sessions
  if (status === 'failed' || status === 'interrupted' || status === 'running') {
    const completedAgents = [];
    const pendingAgents = [];
    const failedAgents = [];

    if (exec.checkpoint) {
      for (const [agent, agentStatus] of Object.entries(exec.checkpoint)) {
        if (agentStatus === 'complete') {
          completedAgents.push(agent.toUpperCase());
        } else if (agentStatus === 'failed' || agentStatus === 'error') {
          failedAgents.push(agent.toUpperCase());
        } else {
          pendingAgents.push(agent.toUpperCase());
        }
      }
    }

    return {
      taskId: exec.taskId,
      description: exec.description,
      status: status,
      startedAt: exec.startedAt,
      completedAgents,
      pendingAgents,
      failedAgents
    };
  }

  return null;
}

/**
 * Generate resume prompt for user
 */
function generateResumePrompt(resumeInfo) {
  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║           INCOMPLETE SESSION DETECTED                        ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  Task ID:     ${resumeInfo.taskId}`);
  lines.push(`  Description: ${resumeInfo.description || 'N/A'}`);
  lines.push(`  Status:      ${resumeInfo.status.toUpperCase()}`);
  lines.push(`  Started:     ${resumeInfo.startedAt}`);
  lines.push('');
  lines.push('┌─ CHECKPOINT STATUS ─────────────────────────────────────────┐');

  const statusIcon = (agents, icon) => agents.length > 0 ? `${icon} ${agents.join(', ')}` : null;

  const completed = statusIcon(resumeInfo.completedAgents, '[DONE]');
  const pending = statusIcon(resumeInfo.pendingAgents, '[PEND]');
  const failed = statusIcon(resumeInfo.failedAgents, '[FAIL]');

  if (completed) lines.push(`│  ${completed.padEnd(60)}│`);
  if (pending) lines.push(`│  ${pending.padEnd(60)}│`);
  if (failed) lines.push(`│  ${failed.padEnd(60)}│`);

  lines.push('└──────────────────────────────────────────────────────────────┘');
  lines.push('');
  lines.push('┌──────────────────────────────────────────────────────────────┐');
  lines.push('│  Resume previous execution?                                  │');
  lines.push('│                                                              │');
  lines.push('│  [Y] Yes - Skip completed agents, continue from checkpoint   │');
  lines.push('│  [N] No  - Discard and start fresh                           │');
  lines.push('└──────────────────────────────────────────────────────────────┘');
  lines.push('');

  return lines.join('\n');
}

/**
 * Output resume data as JSON for programmatic use
 */
function outputResumeJson(resumeInfo) {
  console.log(JSON.stringify({
    resume_available: true,
    task_id: resumeInfo.taskId,
    description: resumeInfo.description,
    status: resumeInfo.status,
    started_at: resumeInfo.startedAt,
    completed_agents: resumeInfo.completedAgents,
    pending_agents: resumeInfo.pendingAgents,
    failed_agents: resumeInfo.failedAgents,
    skip_agents: resumeInfo.completedAgents,
    timestamp: new Date().toISOString()
  }, null, 2));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const flags = {
    summary: args.includes('--summary'),
    reset: args.includes('--reset'),
    json: args.includes('--json'),
    checkResume: args.includes('--check-resume'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (flags.help) {
    console.log(`
Planckatron Memory System

Usage:
  node init-memory.js                Initialize or read memory
  node init-memory.js --summary      Output summary only (no init)
  node init-memory.js --reset        Reset memory to defaults
  node init-memory.js --json         Output raw JSON
  node init-memory.js --check-resume Check for resumable session (JSON output)

Memory Location: ${MEMORY_FILE}

Exit Codes:
  0 - Normal completion (no incomplete session)
  2 - Incomplete session detected (resume available)
    `);
    process.exit(0);
  }

  const { isNew, memory } = initializeMemory(flags.reset);

  // Check for resume mode
  const resumeInfo = checkForResume(memory);

  if (flags.checkResume) {
    // Programmatic mode: output JSON for resume decision
    if (resumeInfo) {
      outputResumeJson(resumeInfo);
      process.exit(2);
    } else {
      console.log(JSON.stringify({
        resume_available: false,
        timestamp: new Date().toISOString()
      }, null, 2));
      process.exit(0);
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(memory, null, 2));
  } else {
    // Show normal summary
    console.log(generateSummary(memory, isNew));

    // If there's an incomplete session, show resume prompt
    if (resumeInfo) {
      console.log(generateResumePrompt(resumeInfo));
    }
  }

  // Exit with code indicating if resumable task exists
  if (resumeInfo) {
    process.exit(2); // Special code: incomplete execution
  }
  process.exit(0);
}

main();
