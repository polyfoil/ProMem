import fs from 'fs';
import path from 'path';
import { TODO_SCAN_EXTENSIONS, COMMENT_MARKERS, TODO_SCAN_MAX_BYTES } from './constants.js';
import { getRelativePath } from './fileops.js';

export function scanForTodos(fileList, rootPath) {
  const issues = [];
  
  // Precompile a single RegExp from the constants for maximum performance (OPT-3)
  const markersPattern = COMMENT_MARKERS.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const todoRegex = new RegExp(`(?:${markersPattern}).*?\\b(TODO|FIXME|HACK|XXX|BUG)\\b`);

  for (const file of fileList) {
    if (!TODO_SCAN_EXTENSIONS.has(path.extname(file))) continue;

    // Test files write TODO/FIXME strings as fixture *data*, not as real
    // debt. Scanning them fills Buglog with entries nobody can act on — in
    // this repository they were 5 of 6 rows.
    const rel = getRelativePath(file, rootPath).replace(/\\/g, '/');
    if (rel.startsWith('tests/') || rel.startsWith('test/') || rel.includes('/tests/') || rel.includes('/test/')) continue;

    try {
      if (fs.statSync(file).size > TODO_SCAN_MAX_BYTES) continue;
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(todoRegex);
        if (!match) continue;

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
