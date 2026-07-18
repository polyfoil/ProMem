import path from 'path';
import { getRelativePath } from './fileops.js';
import { ANATOMY_KEY_FILE_NAMES, ANATOMY_KEY_FILE_LIMIT } from './constants.js';

// Matches "src/" only as a full path segment (not "mysrc/" or "resources/").
const SRC_SEGMENT_RE = /(^|\/)src\//;

// Pipes inside cell text would break the markdown table layout.
export function escapeCell(text) {
  return String(text).replace(/\|/g, '\\|');
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

export function buildKeyFilesLines(allFiles, projectRoot) {
  const lines = ['| File | Purpose |', '|------|---------|'];
  const importantFiles = allFiles.filter(f => {
    const name = path.basename(f);
    const relPath = getRelativePath(f, projectRoot);
    return ANATOMY_KEY_FILE_NAMES.has(name) || SRC_SEGMENT_RE.test(relPath);
  }).slice(0, ANATOMY_KEY_FILE_LIMIT);

  for (const file of importantFiles) {
    lines.push(`| ${escapeCell(getRelativePath(file, projectRoot))} | (pending agent annotation) |`);
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
