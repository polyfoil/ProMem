import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from '../utils/lock.js';
import { findPmRoot } from '../utils/project.js';
import { nextTxNumber, formatTxId, formatMemoryEntry } from '../utils/ledger.js';
import { MEMORY_WARNING_THRESHOLD } from '../utils/constants.js';

export function runMemory(msg, agent = 'Developer') {
  const found = findPmRoot();
  if (!found) {
    console.error('Error: no project memory (.pm/ or ProMem/) found for this project. Run "pm init" first.');
    process.exit(1);
  }
  const { pmDir } = found;
  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');

  if (!fs.existsSync(memoryPath)) {
    console.error(`Error: ${memoryPath} not found. Run "pm status" to repair the structure.`);
    process.exit(1);
  }

  const lockFile = acquireLock(pmDir);
  try {
    const txNumber = nextTxNumber(pmDir);
    const entry = formatMemoryEntry(txNumber, agent, msg);

    fs.appendFileSync(memoryPath, entry);
    console.log(`Logged entry ${formatTxId(txNumber)} to Memory.md`);

    // Check memory size and warn if it's getting bloated
    const content = fs.readFileSync(memoryPath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > MEMORY_WARNING_THRESHOLD) {
      console.warn(`\nWARNING: Memory.md has reached ${lines.length} lines.`);
      console.warn(`Please ask your AI agent to run 'pm compact' to summarize and archive it.`);
    }
  } finally {
    releaseLock(lockFile);
  }
}
