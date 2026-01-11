#!/usr/bin/env node
/**
 * Planckatron Watchdog - Timeout Wrapper Script
 *
 * Wraps any script/agent execution with a configurable timeout.
 * Prevents infinite hangs by forcefully terminating processes that exceed the limit.
 *
 * Usage:
 *   node run-with-timeout.js --timeout 120 -- node some-script.js
 *   node run-with-timeout.js --timeout 60 -- npm run build
 *   node run-with-timeout.js -- node agent.js  # Uses default 120s
 *
 * Exit codes:
 *   0   - Child process completed successfully
 *   124 - Timeout exceeded (process killed)
 *   *   - Child process exit code (passed through)
 */

const { spawn } = require('child_process');

// Configuration
const DEFAULT_TIMEOUT_SECONDS = 120;

/**
 * Parse command line arguments
 * Format: node run-with-timeout.js [--timeout N] -- <command> [args...]
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let timeout = DEFAULT_TIMEOUT_SECONDS;
  let commandStart = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      if (isNaN(timeout) || timeout <= 0) {
        console.error(JSON.stringify({
          status: 'ERROR',
          message: 'Invalid timeout value. Must be a positive integer.',
          timestamp: new Date().toISOString()
        }));
        process.exit(2);
      }
      i++; // Skip the value
    } else if (args[i] === '--') {
      commandStart = i + 1;
      break;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  const command = args.slice(commandStart);

  if (command.length === 0) {
    console.error(JSON.stringify({
      status: 'ERROR',
      message: 'No command specified. Use: node run-with-timeout.js [--timeout N] -- <command>',
      timestamp: new Date().toISOString()
    }));
    process.exit(2);
  }

  return { timeout, command };
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Planckatron Watchdog - Timeout Wrapper

Usage:
  node run-with-timeout.js [--timeout SECONDS] -- <command> [args...]

Options:
  --timeout N    Timeout in seconds (default: ${DEFAULT_TIMEOUT_SECONDS})
  --help, -h     Show this help message

Examples:
  node run-with-timeout.js --timeout 60 -- node agent.js
  node run-with-timeout.js -- npm run build
  node run-with-timeout.js --timeout 300 -- node long-task.js

Exit Codes:
  0   - Command completed successfully
  124 - Timeout exceeded (process was killed)
  *   - Exit code from the child process
  `);
}

/**
 * Kill a process and all its children
 */
function killProcessTree(pid) {
  try {
    // On Unix-like systems, kill the process group
    if (process.platform !== 'win32') {
      process.kill(-pid, 'SIGKILL');
    } else {
      // On Windows, use taskkill
      spawn('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore' });
    }
  } catch (err) {
    // Process may have already exited
    try {
      process.kill(pid, 'SIGKILL');
    } catch (e) {
      // Ignore - process is already gone
    }
  }
}

/**
 * Main execution
 */
function main() {
  const { timeout, command } = parseArgs();
  const [cmd, ...cmdArgs] = command;

  const startTime = Date.now();

  console.error(`[WATCHDOG] Starting: ${command.join(' ')}`);
  console.error(`[WATCHDOG] Timeout: ${timeout}s`);

  // Spawn child process with its own process group (for tree killing)
  const child = spawn(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32'
  });

  let timedOut = false;
  let completed = false;

  // Set up timeout
  const timeoutId = setTimeout(() => {
    if (!completed) {
      timedOut = true;
      console.error(`\n[WATCHDOG] TIMEOUT after ${timeout}s - killing process...`);

      killProcessTree(child.pid);

      // Output JSON error as required
      console.log(JSON.stringify({
        status: 'TIMEOUT',
        timeout_seconds: timeout,
        elapsed_seconds: Math.round((Date.now() - startTime) / 1000),
        command: command.join(' '),
        timestamp: new Date().toISOString()
      }));

      process.exit(124);
    }
  }, timeout * 1000);

  // Handle child exit
  child.on('exit', (code, signal) => {
    completed = true;
    clearTimeout(timeoutId);

    if (!timedOut) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (signal) {
        console.error(`[WATCHDOG] Process killed by signal: ${signal} (${elapsed}s)`);
        process.exit(128 + (signal === 'SIGTERM' ? 15 : signal === 'SIGKILL' ? 9 : 1));
      } else {
        console.error(`[WATCHDOG] Process exited with code: ${code} (${elapsed}s)`);
        process.exit(code || 0);
      }
    }
  });

  // Handle spawn errors
  child.on('error', (err) => {
    completed = true;
    clearTimeout(timeoutId);

    console.error(`[WATCHDOG] Failed to start process: ${err.message}`);
    console.log(JSON.stringify({
      status: 'ERROR',
      message: `Failed to start process: ${err.message}`,
      command: command.join(' '),
      timestamp: new Date().toISOString()
    }));

    process.exit(1);
  });

  // Handle SIGINT/SIGTERM to clean up child
  const cleanup = (signal) => {
    if (!completed) {
      console.error(`\n[WATCHDOG] Received ${signal}, terminating child...`);
      killProcessTree(child.pid);
    }
  };

  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));
}

main();
