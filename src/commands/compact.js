import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from '../utils/lock.js';
import { findPmRoot } from '../utils/project.js';

export function runCompact() {
  const found = findPmRoot();
  if (!found) {
    console.error('Error: no project memory (.pm/ or ProMem/) found for this project. Run "pm init" first.');
    process.exit(1);
  }
  const { pmDir } = found;
  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');
  const archiveDir = path.join(pmDir, 'Archive');

  if (!fs.existsSync(memoryPath)) {
    console.error('Error: Memory.md not found. Run "pm status" to repair the structure.');
    process.exit(1);
  }

  const lockFile = acquireLock(pmDir);
  try {
    // Self-heal: the archive directory may have been deleted manually.
    fs.mkdirSync(archiveDir, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    const archiveFile = path.join(archiveDir, `${today}_Memory_Pending.md`);
    const archiveRelPath = `${path.basename(pmDir)}/Archive/${today}_Memory_Pending.md`;

    if (fs.existsSync(archiveFile)) {
      console.warn(`[WARNING] A compaction is already pending at: ${archiveRelPath}`);
      console.warn('Ask your AI agent to summarize and finalize it (pm-compact skill) before starting a new compaction.');
      return;
    }

    // Move current memory to archive as pending
    fs.renameSync(memoryPath, archiveFile);

    // Create new blank memory with a directive for the AI agent
    const newMemoryContent = `# Memory — Shift Ledger

> [!IMPORTANT]
> A compaction is pending. Ask your AI agent to read \`${archiveRelPath}\`,
> write a "The Story So Far" summary paragraph here, and finalize the archive
> (see the pm-compact skill for the exact procedure).
`;
    fs.writeFileSync(memoryPath, newMemoryContent);

    console.log(`Memory staged for compaction at: ${archiveRelPath}`);
    console.log(`Action required: ask your AI agent to summarize the pending file (pm-compact skill).`);
  } finally {
    releaseLock(lockFile);
  }
}
