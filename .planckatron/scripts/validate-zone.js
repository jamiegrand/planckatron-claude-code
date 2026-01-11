#!/usr/bin/env node
/**
 * Planckatron Zone Police - File Access Validator
 *
 * This script enforces zone boundaries by validating whether an agent
 * is allowed to create or modify a specific file path.
 *
 * Usage:
 *   node validate-zone.js --agent alpha --file "src/components/Button.tsx"
 *   node validate-zone.js --agent beta --file "src/app/layout.tsx" --project-type frontend
 *
 * Exit Codes:
 *   0 - ALLOWED: Agent may proceed with file operation
 *   1 - DENIED: Agent is forbidden from touching this file
 *   2 - ERROR: Invalid arguments or configuration error
 */

const fs = require('fs');
const path = require('path');

// Configuration paths
const PROJECT_TYPES_FILE = path.join(__dirname, '..', 'project-types.json');
const MEMORY_FILE = path.join(__dirname, '..', 'state', 'project-memory.json');

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
 * Load project types configuration
 */
function loadProjectTypes() {
  if (!fs.existsSync(PROJECT_TYPES_FILE)) {
    return { error: 'Project types configuration not found' };
  }

  try {
    const data = fs.readFileSync(PROJECT_TYPES_FILE, 'utf8');
    return { config: JSON.parse(data) };
  } catch (error) {
    return { error: `Failed to parse project-types.json: ${error.message}` };
  }
}

/**
 * Load project memory to get current project type
 */
function loadProjectMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    return null;
  }

  try {
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Convert a glob pattern to a regular expression
 * Supports: *, **, ?, and literal characters
 */
function globToRegex(pattern) {
  // Escape special regex characters except our glob wildcards
  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')     // Placeholder for **
    .replace(/\*/g, '[^/]*')                // * matches anything except /
    .replace(/<<<GLOBSTAR>>>/g, '.*')       // ** matches anything including /
    .replace(/\?/g, '.');                   // ? matches single char

  return new RegExp(`^${regexStr}$`);
}

/**
 * Check if a file path matches a glob pattern
 */
function matchesPattern(filePath, pattern) {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Handle exact file matches (no wildcards)
  if (!normalizedPattern.includes('*') && !normalizedPattern.includes('?')) {
    return normalizedPath === normalizedPattern;
  }

  const regex = globToRegex(normalizedPattern);
  return regex.test(normalizedPath);
}

/**
 * Check if file is in the agent's owned zone
 */
function isInOwnedZone(filePath, ownsPatterns) {
  for (const pattern of ownsPatterns) {
    if (matchesPattern(filePath, pattern)) {
      return { allowed: true, matchedPattern: pattern };
    }
  }
  return { allowed: false };
}

/**
 * Check if file is in a forbidden zone
 */
function isInForbiddenZone(filePath, forbiddenPatterns) {
  for (const pattern of forbiddenPatterns) {
    if (matchesPattern(filePath, pattern)) {
      return { forbidden: true, matchedPattern: pattern };
    }
  }
  return { forbidden: false };
}

/**
 * Validate zone access for an agent and file
 */
function validateZone(agent, filePath, projectType, config) {
  const agentLower = agent.toLowerCase();
  const validAgents = ['alpha', 'beta', 'gamma'];

  if (!validAgents.includes(agentLower)) {
    return {
      status: 'ERROR',
      code: 2,
      message: `Invalid agent: ${agent}. Must be one of: ${validAgents.join(', ')}`
    };
  }

  const typeConfig = config.projectTypes[projectType];
  if (!typeConfig) {
    return {
      status: 'ERROR',
      code: 2,
      message: `Unknown project type: ${projectType}. Available: ${Object.keys(config.projectTypes).join(', ')}`
    };
  }

  const zoneConfig = typeConfig.zones[agentLower];
  if (!zoneConfig) {
    return {
      status: 'ERROR',
      code: 2,
      message: `No zone configuration for agent ${agent} in project type ${projectType}`
    };
  }

  // Normalize file path (remove leading ./ or /)
  const normalizedPath = filePath.replace(/^\.?\//, '');

  // First check: Is the file explicitly forbidden?
  const forbiddenCheck = isInForbiddenZone(normalizedPath, zoneConfig.forbidden || []);
  if (forbiddenCheck.forbidden) {
    return {
      status: 'DENIED',
      code: 1,
      agent: agent.toUpperCase(),
      file: normalizedPath,
      projectType,
      reason: 'FORBIDDEN_ZONE',
      matchedPattern: forbiddenCheck.matchedPattern,
      message: `Agent ${agent.toUpperCase()} is FORBIDDEN from file: ${normalizedPath}`,
      suggestion: `This file belongs to another agent's zone. Pattern matched: ${forbiddenCheck.matchedPattern}`,
      zones: {
        owns: zoneConfig.owns,
        forbidden: zoneConfig.forbidden
      }
    };
  }

  // Second check: Is the file in the agent's owned zone?
  const ownedCheck = isInOwnedZone(normalizedPath, zoneConfig.owns || []);
  if (ownedCheck.allowed) {
    return {
      status: 'ALLOWED',
      code: 0,
      agent: agent.toUpperCase(),
      file: normalizedPath,
      projectType,
      reason: 'OWNED_ZONE',
      matchedPattern: ownedCheck.matchedPattern,
      message: `Agent ${agent.toUpperCase()} is ALLOWED to access: ${normalizedPath}`
    };
  }

  // File is neither owned nor forbidden - default DENY for safety
  return {
    status: 'DENIED',
    code: 1,
    agent: agent.toUpperCase(),
    file: normalizedPath,
    projectType,
    reason: 'NOT_IN_OWNED_ZONE',
    message: `Agent ${agent.toUpperCase()} does not own this file: ${normalizedPath}`,
    suggestion: 'File is outside this agent\'s zone. Request delegation to the correct agent.',
    zones: {
      owns: zoneConfig.owns,
      forbidden: zoneConfig.forbidden
    }
  };
}

/**
 * Output result as JSON
 */
function outputResult(result) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.code);
}

/**
 * Main execution
 */
function main() {
  const args = parseArgs();

  // Help
  if (args.help || Object.keys(args).length === 0) {
    console.log(`
Planckatron Zone Police - File Access Validator

Usage:
  node validate-zone.js --agent <alpha|beta|gamma> --file <path>

Options:
  --agent         Agent requesting access (alpha, beta, gamma)
  --file          File path to validate
  --project-type  Project type (optional, auto-detected from memory)
  --help          Show this help message

Examples:
  node validate-zone.js --agent alpha --file "src/app/layout.tsx"
  node validate-zone.js --agent beta --file "src/components/Button.tsx"
  node validate-zone.js --agent gamma --file "src/app/page.tsx" --project-type frontend

Exit Codes:
  0 - ALLOWED
  1 - DENIED
  2 - ERROR
    `);
    process.exit(0);
  }

  // Validate required arguments
  if (!args.agent) {
    outputResult({
      status: 'ERROR',
      code: 2,
      message: 'Missing required argument: --agent'
    });
  }

  if (!args.file) {
    outputResult({
      status: 'ERROR',
      code: 2,
      message: 'Missing required argument: --file'
    });
  }

  // Load configuration
  const { config, error } = loadProjectTypes();
  if (error) {
    outputResult({
      status: 'ERROR',
      code: 2,
      message: error
    });
  }

  // Determine project type
  let projectType = args['project-type'];
  if (!projectType) {
    // Try to load from memory
    const memory = loadProjectMemory();
    if (memory && memory.projectInfo && memory.projectInfo.type) {
      projectType = memory.projectInfo.type;
    } else {
      // Fall back to default
      projectType = config.defaultType || 'frontend';
    }
  }

  // Validate zone access
  const result = validateZone(args.agent, args.file, projectType, config);
  outputResult(result);
}

main();
