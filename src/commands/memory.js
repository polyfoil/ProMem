import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from '../utils/lock.js';
import { MEMORY_WARNING_THRESHOLD } from '../utils/constants.js';

export function runMemory(msg, agent = 'Developer') {
  const projectRoot = process.cwd();
  const pmDir = path.join(projectRoot, '.pm');
  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');

  if (!fs.existsSync(memoryPath)) {
    console.error('Error: .pm/04_Execution/Memory.md not found. Make sure ProMem is initialized.');
    process.exit(1);
  }

  const lockFile = acquireLock(pmDir);
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const entry = `- [${dateStr} ${timeStr} | Agent: ${agent}]: ${msg}\n`;

    fs.appendFileSync(memoryPath, entry);
    console.log('Logged entry to Memory.md');

    // Check memory size and warn if it's getting bloated
    const content = fs.readFileSync(memoryPath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > MEMORY_WARNING_THRESHOLD) {
      console.warn(`\n⚠️ WARNING: Memory.md has reached ${lines.length} lines.`);
      console.warn(`Please ask your AI agent to run 'pm compact' to summarize and archive it.`);
    }
  } finally {
    releaseLock(lockFile);
  }
}
