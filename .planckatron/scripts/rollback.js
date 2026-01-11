#!/usr/bin/env node
/**
 * Planckatron Rollback Script - Atomic Writes Recovery
 *
 * Provides rollback capability for failed agent executions.
 * Reads the project-memory.json to find files created during a specific
 * session by a specific agent, and deletes them.
 *
 * Usage:
 *   node rollback.js --agent ALPHA --session [SESSION_ID]
 *   node rollback.js --agent BETA --session task-123
 *   node rollback.js --session task-123  # Rollback all agents for session
 *   node rollback.js --dry-run --agent ALPHA --session task-123  # Preview only
 *
 * Exit codes:
 *   0 - Rollback completed successfully
 *   1 - Error during rollback
 *   2 - Invalid arguments
 */

const fs = require('fs');
const path = require('path');

// Configuration
const STATE_DIR = path.join(__dirname, '..', 'state');
const MEMORY_FILE = path.join(STATE_DIR, 'project-memory.json');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    agent: null,
    session: null,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--agent' && args[i + 1]) {
      parsed.agent = args[++i].toUpperCase();
    } else if (arg === '--session' && args[i + 1]) {
      parsed.session = args[++i];
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    }
  }

  return parsed;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Planckatron Rollback Script - Atomic Writes Recovery

Usage:
  node rollback.js --agent AGENT --session SESSION_ID
  node rollback.js --session SESSION_ID  # Rollback all agents
  node rollback.js --dry-run --agent AGENT --session SESSION_ID

Options:
  --agent NAME     Agent name (ALPHA, BETA, GAMMA, or mini-agent ID)
  --session ID     Session/task ID to rollback
  --dry-run        Preview files to be deleted without actually deleting
  --help, -h       Show this help message

Examples:
  node rollback.js --agent ALPHA --session task-123
  node rollback.js --session task-123
  node rollback.js --dry-run --session task-123

Exit Codes:
  0 - Rollback completed successfully
  1 - Error during rollback
  2 - Invalid arguments
  `);
}

/**
 * Load the memory file
 */
function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    console.error(JSON.stringify({
      status: 'ERROR',
      message: 'Memory file not found. Cannot perform rollback.',
      timestamp: new Date().toISOString()
    }));
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(JSON.stringify({
      status: 'ERROR',
      message: `Failed to read memory file: ${error.message}`,
      timestamp: new Date().toISOString()
    }));
    process.exit(1);
  }
}

/**
 * Save the memory file
 */
function saveMemory(memory) {
  memory.updatedAt = new Date().toISOString();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

/**
 * Find files to rollback based on agent and session
 */
function findFilesToRollback(memory, agent, session) {
  const files = [];

  // Check fileRegistry for files created during this session
  for (const fileEntry of memory.fileRegistry) {
    // Match by session (stored in taskId field or createdDuring field)
    const matchesSession = !session ||
      fileEntry.sessionId === session ||
      fileEntry.taskId === session;

    // Match by agent
    const matchesAgent = !agent ||
      fileEntry.createdBy === agent ||
      fileEntry.createdBy?.startsWith(agent.toLowerCase());

    if (matchesSession && matchesAgent) {
      files.push(fileEntry);
    }
  }

  // Also check currentExecution for active session files
  if (memory.currentExecution && memory.currentExecution.taskId === session) {
    if (memory.currentExecution.createdFiles) {
      for (const file of memory.currentExecution.createdFiles) {
        const matchesAgent = !agent || file.agent === agent;
        if (matchesAgent && !files.find(f => f.path === file.path)) {
          files.push({
            path: file.path,
            createdBy: file.agent,
            sessionId: session
          });
        }
      }
    }
  }

  return files;
}

/**
 * Delete a file safely
 */
function deleteFile(filePath, dryRun) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);

  if (!fs.existsSync(absolutePath)) {
    return { path: filePath, status: 'NOT_FOUND' };
  }

  if (dryRun) {
    return { path: filePath, status: 'WOULD_DELETE' };
  }

  try {
    fs.unlinkSync(absolutePath);
    return { path: filePath, status: 'DELETED' };
  } catch (error) {
    return { path: filePath, status: 'ERROR', error: error.message };
  }
}

/**
 * Remove empty parent directories
 */
function cleanupEmptyDirs(filePath, dryRun) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);

  let dir = path.dirname(absolutePath);
  const cleaned = [];

  while (dir !== PROJECT_ROOT && dir !== path.dirname(dir)) {
    try {
      const contents = fs.readdirSync(dir);
      if (contents.length === 0) {
        if (!dryRun) {
          fs.rmdirSync(dir);
        }
        cleaned.push(dir);
      } else {
        break;
      }
    } catch (e) {
      break;
    }
    dir = path.dirname(dir);
  }

  return cleaned;
}

/**
 * Update memory after rollback
 */
function updateMemoryAfterRollback(memory, deletedFiles, agent, session) {
  // Remove deleted files from fileRegistry
  memory.fileRegistry = memory.fileRegistry.filter(f => {
    return !deletedFiles.find(df =>
      df.path === f.path && df.status === 'DELETED'
    );
  });

  // Remove deleted components from componentRegistry
  const deletedPaths = deletedFiles
    .filter(f => f.status === 'DELETED')
    .map(f => f.path);

  memory.componentRegistry = memory.componentRegistry.filter(c => {
    return !deletedPaths.includes(c.path);
  });

  // Mark current execution as failed/rolled back if applicable
  if (memory.currentExecution && memory.currentExecution.taskId === session) {
    memory.currentExecution.status = 'rolled_back';
    memory.currentExecution.rolledBackAt = new Date().toISOString();
    memory.currentExecution.rolledBackAgent = agent || 'ALL';
  }

  // Add rollback to history
  if (!memory.rollbackHistory) {
    memory.rollbackHistory = [];
  }

  memory.rollbackHistory.push({
    timestamp: new Date().toISOString(),
    session: session,
    agent: agent || 'ALL',
    filesDeleted: deletedFiles.filter(f => f.status === 'DELETED').map(f => f.path),
    filesNotFound: deletedFiles.filter(f => f.status === 'NOT_FOUND').map(f => f.path),
    errors: deletedFiles.filter(f => f.status === 'ERROR').map(f => ({
      path: f.path,
      error: f.error
    }))
  });

  return memory;
}

/**
 * Main execution
 */
function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.session) {
    console.error(JSON.stringify({
      status: 'ERROR',
      message: 'Session ID is required. Use --session <ID>',
      timestamp: new Date().toISOString()
    }));
    process.exit(2);
  }

  console.error(`[ROLLBACK] Starting rollback...`);
  console.error(`[ROLLBACK] Session: ${args.session}`);
  console.error(`[ROLLBACK] Agent: ${args.agent || 'ALL'}`);
  console.error(`[ROLLBACK] Dry run: ${args.dryRun}`);

  const memory = loadMemory();

  // Find files to rollback
  const filesToRollback = findFilesToRollback(memory, args.agent, args.session);

  if (filesToRollback.length === 0) {
    console.log(JSON.stringify({
      status: 'NO_FILES',
      message: 'No files found to rollback for this session/agent combination.',
      session: args.session,
      agent: args.agent || 'ALL',
      timestamp: new Date().toISOString()
    }));
    process.exit(0);
  }

  console.error(`[ROLLBACK] Found ${filesToRollback.length} file(s) to process`);

  // Process each file
  const results = [];
  const cleanedDirs = [];

  for (const file of filesToRollback) {
    const result = deleteFile(file.path, args.dryRun);
    results.push(result);

    if (result.status === 'DELETED') {
      const dirs = cleanupEmptyDirs(file.path, args.dryRun);
      cleanedDirs.push(...dirs);
    }

    const statusIcon = {
      'DELETED': '[x]',
      'WOULD_DELETE': '[~]',
      'NOT_FOUND': '[-]',
      'ERROR': '[!]'
    }[result.status];

    console.error(`${statusIcon} ${result.path}${result.error ? ` (${result.error})` : ''}`);
  }

  // Update memory if not dry run
  if (!args.dryRun) {
    const updatedMemory = updateMemoryAfterRollback(
      memory,
      results,
      args.agent,
      args.session
    );
    saveMemory(updatedMemory);
    console.error(`[ROLLBACK] Memory updated`);
  }

  // Output summary
  const summary = {
    status: args.dryRun ? 'DRY_RUN_COMPLETE' : 'ROLLBACK_COMPLETE',
    session: args.session,
    agent: args.agent || 'ALL',
    timestamp: new Date().toISOString(),
    summary: {
      deleted: results.filter(r => r.status === 'DELETED').length,
      would_delete: results.filter(r => r.status === 'WOULD_DELETE').length,
      not_found: results.filter(r => r.status === 'NOT_FOUND').length,
      errors: results.filter(r => r.status === 'ERROR').length
    },
    files: results,
    cleaned_directories: cleanedDirs.length > 0 ? cleanedDirs : undefined
  };

  console.log(JSON.stringify(summary, null, 2));

  // Exit with error code if any deletions failed
  if (results.some(r => r.status === 'ERROR')) {
    process.exit(1);
  }

  process.exit(0);
}

main();
