import path from 'path';
import { getRelativePath } from './fileops.js';
import { ANATOMY_KEY_FILE_NAMES, ANATOMY_KEY_FILE_LIMIT, KEY_FILE_PLACEHOLDER } from './constants.js';

// Matches "src/" only as a full path segment (not "mysrc/" or "resources/").
const SRC_SEGMENT_RE = /(^|\/)src\//;

// Pipes inside cell text would break the markdown table layout.
export function escapeCell(text) {
  return String(text).replace(/\|/g, '\\|');
}

// Inverse of escapeCell for a whole row: split on the delimiters only (an
// escaped "\|" is cell text, not a column boundary) and restore the literal
// pipes. Splitting a generated row on a plain "|" shifts every later cell.
export function splitTableRow(line) {
  if (!line.trim().startsWith('|')) return null;
  const cells = line.split(/(?<!\\)\|/);
  if (cells.length < 3) return null;
  return cells.slice(1, -1).map(cell => cell.trim().replace(/\\\|/g, '|'));
}

export function buildTreeBlockLines(projectTree) {
  const treeLines = projectTree.split('\n');
  if (treeLines.length > 0 && treeLines[treeLines.length - 1] === '') treeLines.pop();
  return ['```', ...treeLines, '```'];
}

export function buildStackTableLines(techStack) {
  const lines = ['| Layer | Technology | Version | Purpose |', '|-------|-----------|---------|---------|'];
  for (const item of techStack) {
    lines.push(`| ${escapeCell(item.layer)} | ${escapeCell(item.technology)} | ${escapeCell(item.version)} | ${escapeCell(item.purpose)} |`);
  }
  return lines;
}

/**
 * Existing "File | Purpose" annotations from an Anatomy document, keyed by the
 * file path. The Key Files table is regenerated on every refresh, so without
 * this the descriptions an agent wrote there would be reset to the placeholder
 * on the next `pm update` (and the pre-read hook would have nothing to show).
 */
export function parseKeyFileDescriptions(content) {
  const descriptions = new Map();
  const lines = content.split('\n');
  const start = lines.findIndex(l => l.trim() === '## Key Files');
  if (start === -1) return descriptions;

  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    const cells = splitTableRow(lines[i]);
    if (!cells || cells.length < 2) continue;

    const file = cells[0].replace(/^`|`$/g, '').trim();
    const purpose = cells[1];
    // Skip the header row and the |---|---| separator.
    if (!file || file === 'File' || /^-+$/.test(file)) continue;
    if (!purpose || /^-+$/.test(purpose) || purpose === KEY_FILE_PLACEHOLDER) continue;
    descriptions.set(file, purpose);
  }
  return descriptions;
}

export function buildKeyFilesLines(allFiles, projectRoot, descriptions = new Map()) {
  const lines = ['| File | Purpose |', '|------|---------|'];
  const importantFiles = allFiles.filter(f => {
    const name = path.basename(f);
    const relPath = getRelativePath(f, projectRoot);
    return ANATOMY_KEY_FILE_NAMES.has(name) || SRC_SEGMENT_RE.test(relPath);
  }).slice(0, ANATOMY_KEY_FILE_LIMIT);

  // Rows are driven by the files that exist now: a file that disappeared drops
  // out of the table, and its stale annotation goes with it.
  for (const file of importantFiles) {
    const relPath = getRelativePath(file, projectRoot);
    const purpose = descriptions.get(relPath) || KEY_FILE_PLACEHOLDER;
    lines.push(`| ${escapeCell(relPath)} | ${escapeCell(purpose)} |`);
  }
  return lines;
}

export function buildBuglogTableLines(issues) {
  const lines = ['| ID | Severity | Description | File(s) | Status |', '|----|----------|-------------|---------|--------|'];
  for (const issue of issues) {
    lines.push(`| ${issue.id} | ${issue.severity} | ${escapeCell(issue.description)} | ${escapeCell(issue.file)} | ${issue.status} |`);
  }
  return lines;
}
