import fs from 'fs';
import path from 'path';
import { MEMORY_WARNING_THRESHOLD } from '../utils/constants.js';

export function runStatus() {
  const projectRoot = process.cwd();
  const pmDir = path.join(projectRoot, '.pm');

  if (!fs.existsSync(pmDir)) {
    console.error('Error: .pm directory not found. Please run "pm init" first.');
    process.exit(1);
  }

  let issuesFound = 0;
  let fixedIssues = 0;

  console.log('Running ProMem health check...\n');

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
    fs.writeFileSync(memoryPath, `# Memory — Shift Ledger\n\n- [${new Date().toISOString().split('T')[0]} 00:00 | Agent: pm-cli]: Auto-recovered Memory.md\n`);
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

  console.log('\n--- Status Report ---');
  if (issuesFound === 0) {
    console.log('✅ ProMem structure is completely healthy.');
  } else {
    console.log(`⚠️ Found ${issuesFound} issues.`);
    console.log(`🔧 Auto-fixed ${fixedIssues} issues.`);
  }
}
