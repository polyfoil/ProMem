import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from '../utils/lock.js';

export function runCompact() {
  const projectRoot = process.cwd();
  const pmDir = path.join(projectRoot, '.pm');
  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');
  const archiveDir = path.join(pmDir, 'Archive');

  if (!fs.existsSync(memoryPath)) {
    console.error('Error: Memory.md not found.');
    process.exit(1);
  }

  const lockFile = acquireLock(pmDir);
  try {
    const today = new Date().toISOString().split('T')[0];
    const archiveFile = path.join(archiveDir, `${today}_Memory_Pending.md`);
    
    // Check if there is already a pending compaction
    if (fs.existsSync(archiveFile)) {
      console.warn(`[WARNING] A compaction is already pending at: ${archiveFile}`);
      console.warn(`Please ask your AI agent to read it and summarize it before starting a new compaction.`);
      return;
    }

    // Move current memory to archive as pending
    fs.renameSync(memoryPath, archiveFile);
    
    // Create new blank memory with prompt for AI
    const newMemoryContent = `# Memory — Shift Ledger

> [!IMPORTANT]
> Ajanınızdan \`${archiveFile}\` dosyasını okuyup, o dosyadaki tüm olayları özetleyerek buraya "The Story So Far" (Şu Ana Kadar Neler Oldu) paragrafını yazmasını isteyin.
`;
    fs.writeFileSync(memoryPath, newMemoryContent);

    console.log(`✅ Memory staged for compaction at: Archive/${today}_Memory_Pending.md`);
    console.log(`🤖 Action Required: Ask your AI agent to run 'pm compact' to summarize the pending file.`);
  } finally {
    releaseLock(lockFile);
  }
}
