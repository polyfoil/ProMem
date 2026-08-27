import fs from 'fs';
import path from 'path';
import { walkProject, replaceSection } from '../utils/fileops.js';
import { findPmRoot } from '../utils/project.js';
import { buildStackTableLines, buildKeyFilesLines, buildBuglogTableLines, buildTreeBlockLines, parseKeyFileDescriptions } from '../utils/markdown.js';
import { detectTechStack } from '../utils/detectors.js';
import { scanForTodos } from '../utils/scanner.js';
import { acquireLock, releaseLock, tryAcquireLock } from '../utils/lock.js';
import { HOOK_LOCK_RETRIES, HOOK_LOCK_RETRY_MS } from '../utils/constants.js';

// Rows in Open Issues whose ID does not carry the scanner's ISSUE- prefix
// were written by humans/agents and must survive a refresh untouched.
function manualOpenIssueRows(content) {
  const lines = content.split('\n');
  const start = lines.findIndex(l => l.trim() === '## Open Issues');
  if (start === -1) return [];
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 3 || !line.trim().startsWith('|')) continue;
    const id = cells[1];
    if (!id || id === 'ID' || /^-+$/.test(id) || id.startsWith('ISSUE-')) continue;
    rows.push(line);
  }
  return rows;
}

// Refresh the scanner-derived rows of Buglog's Open Issues (init writes them
// once; a living project needs the same idempotent refresh path here).
//
// Always a full rescan. An incremental variant (scan only the files the agent
// touched, carry the other rows over from the table) lived here and was
// removed: the scan is already bounded by an extension filter and a file-size
// ceiling, no measurement ever showed it as a bottleneck, and re-reading the
// table it had just written cost three defect classes — rows for files deleted
// outside the session lived forever, files changed by anything other than the
// agent were never rescanned, and a description containing "|" was parsed back
// into the wrong columns. Reintroduce it only behind a measurement and tests.
function refreshBuglog(buglogPath, allFiles, projectRoot) {
  const content = fs.readFileSync(buglogPath, 'utf8');
  const manualRows = manualOpenIssueRows(content);
  const issues = scanForTodos(allFiles, projectRoot);

  const tableLines = [...buildBuglogTableLines(issues), ...manualRows];
  fs.writeFileSync(buglogPath, replaceSection(content, '## Open Issues', tableLines));
}

export function runUpdate({ skipLock = false } = {}) {
  // The brain describes one project; when run from a worktree or a
  // subdirectory, scan the project root the brain belongs to.
  const found = findPmRoot();
  if (!found) {
    console.error('Error: no project memory (.pm/ or ProMem/) found for this project. Run "pm init" first.');
    process.exit(1);
  }
  const { projectRoot, pmDir } = found;

  // When called from the hook layer (skipLock=true), use non-blocking lock
  // acquisition — if the lock is held, silently skip (fail-open contract).
  let lockFile = null;
  if (skipLock) {
    lockFile = tryAcquireLock(pmDir, HOOK_LOCK_RETRIES, HOOK_LOCK_RETRY_MS);
    if (!lockFile) return;
  } else {
    lockFile = acquireLock(pmDir);
  }

  try {
  console.log('Refreshing ProMem generated knowledge...');
  const { fileList: allFiles, tree: projectTree } = walkProject(projectRoot, projectRoot);
  const treeBlockLines = buildTreeBlockLines(projectTree);

  let updated = [];

  const archPath = path.join(pmDir, '03_Specifications', 'Architecture.md');
  if (fs.existsSync(archPath)) {
    const techStack = detectTechStack(projectRoot);
    let content = fs.readFileSync(archPath, 'utf8');
    content = replaceSection(content, '## Tech Stack', buildStackTableLines(techStack));
    content = replaceSection(content, '## Directory Structure', treeBlockLines);
    fs.writeFileSync(archPath, content);
    updated.push('Architecture.md (Tech Stack, Directory Structure)');
  }

  const anatomyPath = path.join(pmDir, '04_Execution', 'Anatomy.md');
  if (fs.existsSync(anatomyPath)) {
    let content = fs.readFileSync(anatomyPath, 'utf8');
    // Key Files is regenerated wholesale, so the annotations an agent wrote
    // into it have to be carried across explicitly — they are the half of the
    // index that actually saves the next session from scanning the codebase.
    const descriptions = parseKeyFileDescriptions(content);
    content = replaceSection(content, '## Project Root', treeBlockLines);
    content = replaceSection(content, '## Key Files', buildKeyFilesLines(allFiles, projectRoot, descriptions));
    fs.writeFileSync(anatomyPath, content);
    updated.push(`Anatomy.md (Project Root, Key Files — ${descriptions.size} annotation(s) preserved)`);
  }

  const buglogPath = path.join(pmDir, '04_Execution', 'Buglog.md');
  if (fs.existsSync(buglogPath)) {
    refreshBuglog(buglogPath, allFiles, projectRoot);
    updated.push('Buglog.md (Open Issues — scanner rows; manual rows preserved)');
  }

  if (updated.length === 0) {
    console.log('Nothing to update — Architecture.md and Anatomy.md not found under .pm/.');
    return;
  }

  console.log(`Updated: ${updated.join(', ')}`);
  console.log(`Files scanned: ${allFiles.length}`);
  console.log('\nManual sections (Module Map, Key Design Decisions, System Diagram, Data Flow) were left untouched.');
  } finally {
    releaseLock(lockFile);
  }
}
