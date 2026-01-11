#!/usr/bin/env node
/**
 * Planckatron Memory System - Registry Update Script
 *
 * This script is called by agents to register their created files
 * and components in the persistent memory store.
 *
 * Usage:
 *   node update-registry.js --agent ALPHA --file "src/app/layout.tsx" --purpose "Root layout"
 *   node update-registry.js --agent BETA --component "Button" --path "src/components/ui/Button.tsx" --exports "Button,ButtonProps"
 *   node update-registry.js --agent ORCHESTRATOR --decision "Use Inter font" --rationale "Per design system"
 *   node update-registry.js --set-project-type "frontend" --stack "Next.js,TypeScript,Tailwind"
 *   node update-registry.js --set-design-token "colors.bg.primary" "#1a1a2e"
 *   node update-registry.js --start-execution "task-123" --description "Build user dashboard"
 *   node update-registry.js --update-checkpoint --agent ALPHA --status complete
 *   node update-registry.js --complete-execution
 */

const fs = require('fs');
const path = require('path');

// Configuration
const STATE_DIR = path.join(__dirname, '..', 'state');
const MEMORY_FILE = path.join(STATE_DIR, 'project-memory.json');

/**
 * Load the memory file
 */
function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    console.error('[ERROR] Memory file not found. Run init-memory.js first.');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`[ERROR] Failed to read memory file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Save the memory file
 */
function saveMemory(memory) {
  memory.updatedAt = new Date().toISOString();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  console.log('[MEMORY] Updated successfully.');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      parsed[key] = value;
    }
  }

  return parsed;
}

/**
 * Add a file to the registry
 */
function addFile(memory, agent, filePath, purpose) {
  // Check for duplicates
  const existing = memory.fileRegistry.find(f => f.path === filePath);
  if (existing) {
    existing.modifiedAt = new Date().toISOString();
    existing.modifiedBy = agent;
    console.log(`[MEMORY] Updated file: ${filePath} (modified by ${agent})`);
  } else {
    memory.fileRegistry.push({
      path: filePath,
      createdBy: agent,
      purpose: purpose || '',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    });
    console.log(`[MEMORY] Registered file: ${filePath} (created by ${agent})`);
  }
}

/**
 * Add a component to the registry
 */
function addComponent(memory, agent, name, componentPath, exports) {
  // Check for duplicates
  const existing = memory.componentRegistry.find(c => c.name === name);
  if (existing) {
    existing.version = (parseFloat(existing.version) + 0.1).toFixed(1);
    existing.modifiedAt = new Date().toISOString();
    existing.modifiedBy = agent;
    console.log(`[MEMORY] Updated component: ${name} v${existing.version}`);
  } else {
    memory.componentRegistry.push({
      name,
      path: componentPath,
      createdBy: agent,
      version: '1.0',
      exports: exports ? exports.split(',').map(e => e.trim()) : [name],
      createdAt: new Date().toISOString()
    });
    console.log(`[MEMORY] Registered component: ${name} (created by ${agent})`);
  }
}

/**
 * Add an architecture decision
 */
function addDecision(memory, agent, decision, rationale) {
  memory.architectureDecisions.push({
    date: new Date().toISOString().split('T')[0],
    decision,
    rationale: rationale || '',
    madeBy: agent
  });
  console.log(`[MEMORY] Recorded decision: "${decision}"`);
}

/**
 * Set project type and stack
 */
function setProjectInfo(memory, type, stack) {
  memory.projectInfo.type = type;
  memory.projectInfo.stack = stack ? stack.split(',').map(s => s.trim()) : [];
  memory.projectInfo.detectedAt = new Date().toISOString();
  console.log(`[MEMORY] Set project type: ${type}, stack: ${memory.projectInfo.stack.join(', ')}`);
}

/**
 * Set a design token (dot notation path)
 */
function setDesignToken(memory, tokenPath, value) {
  const parts = tokenPath.split('.');
  let obj = memory.designSystem;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }

  obj[parts[parts.length - 1]] = value;
  console.log(`[MEMORY] Set design token: ${tokenPath} = ${value}`);
}

/**
 * Start a new execution
 */
function startExecution(memory, taskId, description) {
  if (memory.currentExecution) {
    console.warn('[WARN] Previous execution not completed. Overwriting.');
  }

  memory.currentExecution = {
    taskId,
    description,
    phase: 'STARTED',
    startedAt: new Date().toISOString(),
    checkpoint: {
      alpha: 'pending',
      beta: 'pending',
      gamma: 'pending'
    }
  };
  console.log(`[MEMORY] Started execution: ${taskId}`);
}

/**
 * Update checkpoint for an agent
 */
function updateCheckpoint(memory, agent, status) {
  if (!memory.currentExecution) {
    console.error('[ERROR] No active execution.');
    process.exit(1);
  }

  const agentKey = agent.toLowerCase();
  memory.currentExecution.checkpoint[agentKey] = status;
  memory.currentExecution.phase = 'EXECUTING';
  console.log(`[MEMORY] Checkpoint: ${agent} = ${status}`);
}

/**
 * Complete the current execution
 */
function completeExecution(memory) {
  if (!memory.currentExecution) {
    console.error('[ERROR] No active execution to complete.');
    process.exit(1);
  }

  // Move to history
  memory.history.push({
    taskId: memory.currentExecution.taskId,
    description: memory.currentExecution.description,
    status: 'complete',
    startedAt: memory.currentExecution.startedAt,
    completedAt: new Date().toISOString(),
    checkpoint: memory.currentExecution.checkpoint
  });

  memory.currentExecution = null;
  console.log('[MEMORY] Execution completed and moved to history.');
}

/**
 * Main execution
 */
function main() {
  const args = parseArgs();

  if (args.help || Object.keys(args).length === 0) {
    console.log(`
Planckatron Registry Update Script

File Registration:
  --agent ALPHA --file "path/to/file.tsx" --purpose "Description"

Component Registration:
  --agent BETA --component "Button" --path "path/to/Button.tsx" --exports "Button,ButtonProps"

Architecture Decision:
  --agent ORCHESTRATOR --decision "Decision text" --rationale "Why"

Project Info:
  --set-project-type "frontend" --stack "Next.js,TypeScript,Tailwind"

Design Tokens:
  --set-design-token "colors.bg.primary" "#1a1a2e"

Execution Tracking:
  --start-execution "task-123" --description "Task description"
  --update-checkpoint --agent ALPHA --status complete
  --complete-execution
    `);
    process.exit(0);
  }

  const memory = loadMemory();

  // File registration
  if (args.file && args.agent) {
    addFile(memory, args.agent, args.file, args.purpose);
  }

  // Component registration
  if (args.component && args.agent) {
    addComponent(memory, args.agent, args.component, args.path, args.exports);
  }

  // Architecture decision
  if (args.decision && args.agent) {
    addDecision(memory, args.agent, args.decision, args.rationale);
  }

  // Project info
  if (args['set-project-type']) {
    setProjectInfo(memory, args['set-project-type'], args.stack);
  }

  // Design token
  if (args['set-design-token']) {
    setDesignToken(memory, args['set-design-token'], args[Object.keys(args).find(k => !k.startsWith('set-') && k !== 'set-design-token')]);
  }

  // Execution tracking
  if (args['start-execution']) {
    startExecution(memory, args['start-execution'], args.description);
  }

  if (args['update-checkpoint'] && args.agent) {
    updateCheckpoint(memory, args.agent, args.status || 'complete');
  }

  if (args['complete-execution']) {
    completeExecution(memory);
  }

  saveMemory(memory);
}

main();
