import fs from 'fs';
import path from 'path';
import { TEMPLATES_DIR, IGNORE_DIRS, MAX_SCAN_DEPTH } from './constants.js';

export function loadTemplate(relPath, fallback) {
  try {
    return fs.readFileSync(path.join(TEMPLATES_DIR, relPath), 'utf8');
  } catch (err) {
    console.warn(`Warning: template ${relPath} not found, using minimal fallback.`);
    return fallback;
  }
}

export function getRelativePath(absolutePath, rootPath) {
  return path.relative(rootPath, absolutePath).replace(/\\/g, '/');
}

export function walkProject(dir, rootPath) {
  const fileList = [];
  const truncatedPaths = [];
  let tree = '';

  function walk(currentDir, currentDepth, suppressTree) {
    if (currentDepth > MAX_SCAN_DEPTH) {
      truncatedPaths.push(getRelativePath(currentDir, rootPath) || '.');
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      return;
    }

    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const indent = '  '.repeat(currentDepth);
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const res = path.resolve(currentDir, entry.name);
      const isHidden = entry.name.startsWith('.');
      const hideSubtree = suppressTree || isHidden;

      if (entry.isDirectory()) {
        if (!hideSubtree) tree += `${indent}├── ${entry.name}/\n`;
        walk(res, currentDepth + 1, hideSubtree);
      } else {
        fileList.push(res);
        if (!hideSubtree) tree += `${indent}├── ${entry.name}\n`;
      }
    }
  }

  walk(dir, 0, false);

  if (truncatedPaths.length > 0) {
    const sample = truncatedPaths.slice(0, 3).join(', ');
    console.warn(`Warning: scan depth limit (${MAX_SCAN_DEPTH}) reached; skipped ${truncatedPaths.length} subdirectory(ies), e.g. ${sample}`);
  }

  return { fileList, tree };
}

export function replaceSection(content, headerText, newBodyLines) {
  const lines = content.split('\n');
  const headerIdx = lines.findIndex(l => l.trim() === headerText);

  if (headerIdx === -1) {
    return content.replace(/\n+$/, '\n') + `\n${headerText}\n\n${newBodyLines.join('\n')}\n`;
  }

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { endIdx = i; break; }
  }

  const before = lines.slice(0, headerIdx + 1);
  const after = lines.slice(endIdx);
  return [...before, '', ...newBodyLines, '', ...after].join('\n');
}
