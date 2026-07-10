import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStackTableLines, buildKeyFilesLines, buildBuglogTableLines } from '../src/utils/markdown.js';

// Format-drift guard: skills, templates, and the code generators have drifted
// apart before (two coexisting Memory entry formats nearly caused silent data
// loss in pm compact — see Cerebrum). This suite pins them together in CI.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function collectMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMarkdownFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const DOC_FILES = [
  ...collectMarkdownFiles(path.join(ROOT, 'skills')),
  ...collectMarkdownFiles(path.join(ROOT, 'templates')),
  path.join(ROOT, 'README.md')
];

// The only valid ledger entry format (Cerebrum: "Single-Line Transaction
// Format Is Canonical"). Placeholder dates like YYYY-MM-DD are allowed.
const CANONICAL_ENTRY = /- \[TX-\d{4} \| [^|\]]+ \| Agent: [^\]]+\]:/;

test('ledger entry format is canonical everywhere it is taught', async (t) => {
  await t.test('every documented entry example uses the single-line TX format', () => {
    for (const file of DOC_FILES) {
      const rel = path.relative(ROOT, file);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        // A line that shows a ledger entry (bracket + Agent:) must conform.
        if (/\[.*Agent:/.test(line)) {
          assert.match(line, CANONICAL_ENTRY, `${rel}:${i + 1} shows a non-canonical ledger entry format: "${line.trim()}"`);
        }
      });
    }
  });

  await t.test('the retired multi-line block format never reappears', () => {
    for (const file of DOC_FILES) {
      const rel = path.relative(ROOT, file);
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!content.includes('**Agent:**'), `${rel} resurrects the retired multi-line entry format (**Agent:** field)`);
    }
  });
});

test('template table headers match the code generators', async (t) => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, 'templates', rel), 'utf8');

  await t.test('Architecture Tech Stack header', () => {
    assert.ok(read('03_Specifications/Architecture.md').includes(buildStackTableLines([])[0]),
      'templates/03_Specifications/Architecture.md and buildStackTableLines disagree on the Tech Stack columns');
  });

  await t.test('Anatomy Key Files header', () => {
    assert.ok(read('04_Execution/Anatomy.md').includes(buildKeyFilesLines([], ROOT)[0]),
      'templates/04_Execution/Anatomy.md and buildKeyFilesLines disagree on the Key Files columns');
  });

  await t.test('Buglog Open Issues header', () => {
    assert.ok(read('04_Execution/Buglog.md').includes(buildBuglogTableLines([])[0]),
      'templates/04_Execution/Buglog.md and buildBuglogTableLines disagree on the Open Issues columns');
  });
});

test('templates referenced by the code exist on disk', () => {
  const source = fs.readdirSync(path.join(ROOT, 'src', 'commands'))
    .map(f => fs.readFileSync(path.join(ROOT, 'src', 'commands', f), 'utf8'))
    .join('\n');
  for (const match of source.matchAll(/loadTemplate\('([^']+)'/g)) {
    assert.ok(fs.existsSync(path.join(ROOT, 'templates', match[1])), `templates/${match[1]} is referenced by the code but missing from templates/ (SSOT)`);
  }
});
