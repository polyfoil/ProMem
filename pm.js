#!/usr/bin/env node

import fs from 'fs';
import { fileURLToPath } from 'url';
import { runCli } from './src/cli.js';

// Programmatic API — used by the test suite and external tooling.
export { runInit } from './src/commands/init.js';
export { runUpdate } from './src/commands/update.js';
export { runMemory } from './src/commands/memory.js';
export { runCompact } from './src/commands/compact.js';
export { runStatus } from './src/commands/status.js';
export { runHook } from './src/commands/hook.js';
export { runLink } from './src/commands/link.js';
export { detectTechStack } from './src/utils/detectors.js';
export { scanForTodos } from './src/utils/scanner.js';
export { loadTemplate } from './src/utils/fileops.js';

const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  (fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)))
);

if (isDirectRun) {
  const args = process.argv.slice(2);
  runCli(args);
}
