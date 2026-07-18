import fs from 'fs';
import path from 'path';
import { findPmRoot } from '../utils/project.js';
import { nextTxNumber, formatMemoryEntry } from '../utils/ledger.js';
import { MEMORY_WARNING_THRESHOLD } from '../utils/constants.js';
import { acquireLock, releaseLock } from '../utils/lock.js';

export function runStatus() {
  const found = findPmRoot();
  if (!found) {
    console.error('Error: no project memory (.pm/ or ProMem/) found for this project. Run "pm init" first.');
    process.exit(1);
  }
  const { pmDir } = found;
  console.log(`Project memory: ${pmDir}`);

  let issuesFound = 0;
  let fixedIssues = 0;

  console.log('Running ProMem health check...\n');

  // --- Write section: directory creation and Memory.md repair under lock ---
  const lockFile = acquireLock(pmDir);
  try {

  // Check required directories
  const requiredDirs = ['01_Foundations', '02_Planning', '03_Specifications', '04_Execution', '05_Resources', 'Archive'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(pmDir, dir);
    if (!fs.existsSync(dirPath)) {
      issuesFound++;
      console.warn(`[WARNING] Missing directory: ${dir}`);
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  -> [FIXED] Created directory ${dir}`);
      fixedIssues++;
    }
  }

  // Check Memory.md integrity
  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');
  if (!fs.existsSync(memoryPath)) {
    issuesFound++;
    console.warn(`[WARNING] Missing Memory.md`);
    const recoveryEntry = formatMemoryEntry(nextTxNumber(pmDir), 'pm-cli', 'Auto-recovered Memory.md');
    fs.writeFileSync(memoryPath, `# Memory — Shift Ledger\n\n${recoveryEntry}`);
    console.log(`  -> [FIXED] Created Memory.md with default header`);
    fixedIssues++;
  } else {
    let content = fs.readFileSync(memoryPath, 'utf8');
    if (!content.includes('# Memory — Shift Ledger')) {
      issuesFound++;
      console.warn(`[WARNING] Memory.md is missing its standard header`);
      content = `# Memory — Shift Ledger\n\n` + content;
      fs.writeFileSync(memoryPath, content);
      console.log(`  -> [FIXED] Restored standard header in Memory.md`);
      fixedIssues++;
    }

    const lines = content.split('\n');
    if (lines.length > MEMORY_WARNING_THRESHOLD) {
      console.warn(`[WARNING] Memory.md is getting large (${lines.length} lines). Consider running 'pm compact' via your AI agent.`);
    }
  }

  } finally {
    releaseLock(lockFile);
  }
  // --- End write section ---

  // Core layer files cannot be regenerated without a project scan — report
  // them so the user/agent knows to consult the pm-init skill, don't fabricate.
  const coreFiles = [
    '01_Foundations/Brief.md',
    '03_Specifications/Architecture.md',
    '04_Execution/Anatomy.md',
    '04_Execution/Cerebrum.md',
    '04_Execution/Buglog.md'
  ];
  for (const relPath of coreFiles) {
    if (!fs.existsSync(path.join(pmDir, ...relPath.split('/')))) {
      issuesFound++;
      console.warn(`[WARNING] Missing ${relPath} — cannot auto-create (needs project knowledge). Ask your AI agent to restore it (pm-init skill).`);
    }
  }

  // Surface any pending compaction so the agent knows to finish it
  const archiveDir = path.join(pmDir, 'Archive');
  let pendingFiles = [];
  try {
    pendingFiles = fs.readdirSync(archiveDir).filter(f => f.endsWith('_Memory_Pending.md'));
  } catch (err) {
    // Archive was just recreated above if missing; a read failure here is non-fatal.
  }
  if (pendingFiles.length > 0) {
    console.warn(`[WARNING] Pending compaction found: Archive/${pendingFiles[0]}. Ask your AI agent to summarize and finalize it (pm-compact skill).`);
  }

  console.log('\n--- Status Report ---');
  if (issuesFound === 0) {
    console.log('ProMem structure is completely healthy.');
  } else {
    console.log(`Found ${issuesFound} issues.`);
    console.log(`Auto-fixed ${fixedIssues} issues.`);
  }
}
