import fs from 'fs';
import path from 'path';
import { findPmRoot } from '../utils/project.js';
import { nextTxNumber, formatMemoryEntry } from '../utils/ledger.js';
import { MEMORY_WARNING_THRESHOLD, PROMEM_DIRECTORIES } from '../utils/constants.js';
import { acquireLock, releaseLock } from '../utils/lock.js';

// Layer files that carry project knowledge: they cannot be regenerated from a
// template without rescanning the project, so status reports them instead of
// fabricating an empty replacement.
const CORE_FILES = [
  '01_Foundations/Brief.md',
  '03_Specifications/Architecture.md',
  '04_Execution/Anatomy.md',
  '04_Execution/Cerebrum.md',
  '04_Execution/Buglog.md'
];

// Every check returns { issues, fixed } so runStatus stays a summary.

function checkDirectories(pmDir) {
  let issues = 0;
  let fixed = 0;
  for (const dir of PROMEM_DIRECTORIES) {
    const dirPath = path.join(pmDir, dir);
    if (fs.existsSync(dirPath)) continue;
    issues++;
    console.warn(`[WARNING] Missing directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  -> [FIXED] Created directory ${dir}`);
    fixed++;
  }
  return { issues, fixed };
}

function checkMemory(pmDir) {
  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');

  if (!fs.existsSync(memoryPath)) {
    console.warn('[WARNING] Missing Memory.md');
    const recoveryEntry = formatMemoryEntry(nextTxNumber(pmDir), 'pm-cli', 'Auto-recovered Memory.md');
    fs.writeFileSync(memoryPath, `# Memory — Shift Ledger\n\n${recoveryEntry}`);
    console.log('  -> [FIXED] Created Memory.md with default header');
    return { issues: 1, fixed: 1 };
  }

  let content = fs.readFileSync(memoryPath, 'utf8');
  let issues = 0;
  let fixed = 0;

  if (!content.includes('# Memory — Shift Ledger')) {
    issues++;
    console.warn('[WARNING] Memory.md is missing its standard header');
    content = `# Memory — Shift Ledger\n\n` + content;
    fs.writeFileSync(memoryPath, content);
    console.log('  -> [FIXED] Restored standard header in Memory.md');
    fixed++;
  }

  const lines = content.split('\n');
  if (lines.length > MEMORY_WARNING_THRESHOLD) {
    console.warn(`[WARNING] Memory.md is getting large (${lines.length} lines). Consider running 'pm compact' via your AI agent.`);
  }
  return { issues, fixed };
}

function checkCoreFiles(pmDir) {
  let issues = 0;
  for (const relPath of CORE_FILES) {
    if (fs.existsSync(path.join(pmDir, ...relPath.split('/')))) continue;
    issues++;
    console.warn(`[WARNING] Missing ${relPath} — cannot auto-create (needs project knowledge). Ask your AI agent to restore it (pm-init skill).`);
  }
  return { issues, fixed: 0 };
}

function checkPendingCompaction(pmDir) {
  let pendingFiles = [];
  try {
    pendingFiles = fs.readdirSync(path.join(pmDir, 'Archive')).filter(f => f.endsWith('_Memory_Pending.md'));
  } catch (err) {
    // Archive was recreated by checkDirectories if missing; a read failure
    // here is non-fatal.
  }
  if (pendingFiles.length > 0) {
    console.warn(`[WARNING] Pending compaction found: Archive/${pendingFiles[0]}. Ask your AI agent to summarize and finalize it (pm-compact skill).`);
  }
  return { issues: 0, fixed: 0 };
}

export function runStatus() {
  const found = findPmRoot();
  if (!found) {
    console.error('Error: no project memory (.pm/ or ProMem/) found for this project. Run "pm init" first.');
    process.exit(1);
  }
  const { pmDir } = found;
  console.log(`Project memory: ${pmDir}`);
  console.log('Running ProMem health check...\n');

  const results = [];

  // The repairing checks write to the brain, so they run under the lock.
  const lockFile = acquireLock(pmDir);
  try {
    results.push(checkDirectories(pmDir));
    results.push(checkMemory(pmDir));
  } finally {
    releaseLock(lockFile);
  }

  results.push(checkCoreFiles(pmDir));
  results.push(checkPendingCompaction(pmDir));

  const issuesFound = results.reduce((sum, r) => sum + r.issues, 0);
  const fixedIssues = results.reduce((sum, r) => sum + r.fixed, 0);

  console.log('\n--- Status Report ---');
  if (issuesFound === 0) {
    console.log('ProMem structure is completely healthy.');
  } else {
    console.log(`Found ${issuesFound} issues.`);
    console.log(`Auto-fixed ${fixedIssues} issues.`);
  }
}
