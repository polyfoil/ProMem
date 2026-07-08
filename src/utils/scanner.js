import fs from 'fs';
import path from 'path';
import { TODO_SCAN_EXTENSIONS, COMMENT_MARKERS } from './constants.js';
import { getRelativePath } from './fileops.js';

export function scanForTodos(fileList, rootPath) {
  const issues = [];
  const todoRegex = /\b(TODO|FIXME|HACK|XXX|BUG)\b/;

  for (const file of fileList) {
    if (!TODO_SCAN_EXTENSIONS.has(path.extname(file))) continue;

    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(todoRegex);
        if (!match) continue;

        const keywordIdx = match.index;
        const isInComment = COMMENT_MARKERS.some(marker => {
          const markerIdx = line.indexOf(marker);
          return markerIdx !== -1 && markerIdx <= keywordIdx;
        });
        if (!isInComment) continue;

        const type = match[1];
        const description = line.trim().replace(/^\/\/|^\/\*|^\*|^#|^<!--|^--/, '').trim();
        issues.push({
          id: `ISSUE-${String(issues.length + 1).padStart(3, '0')}`,
          severity: type === 'FIXME' || type === 'BUG' ? 'High' : 'Medium',
          description,
          file: `${getRelativePath(file, rootPath)}:${i + 1}`,
          status: 'Open'
        });
      }
    } catch (e) {
      console.warn(`Warning: Failed to read file ${file} for TODO scan: ${e.message}`);
    }
  }
  return issues;
}
