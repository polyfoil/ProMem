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

test('the README skill table lists every skill on disk', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const onDisk = fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  assert.ok(onDisk.length > 0, 'the skills directory should not be empty');
  for (const skill of onDisk) {
    assert.ok(readme.includes(`| \`${skill}\` |`),
      `README's skill table has no row for skills/${skill} — the published inventory has drifted from disk`);
  }
});

test('each skill declares the name of its own directory', () => {
  const skillsDir = path.join(ROOT, 'skills');
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const frontmatter = fs.readFileSync(path.join(skillsDir, entry.name, 'SKILL.md'), 'utf8');
    const declared = frontmatter.match(/^name:\s*(\S+)\s*$/m);
    assert.ok(declared, `skills/${entry.name}/SKILL.md has no name: field`);
    assert.strictEqual(declared[1], entry.name,
      `skills/${entry.name}/SKILL.md declares "${declared[1]}" — the directory name is how the skill is invoked, so the two must match`);
  }
});

test('Cerebrum rule sources cite a TX id', () => {
  // The ledger's TX ids are the relation graph between the memory documents;
  // a Source field that cites a date or a task name instead is not greppable
  // back to the entry it came from.
  for (const file of DOC_FILES) {
    const rel = path.relative(ROOT, file);
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (!line.includes('**Source:**')) return;
      assert.match(line, /\*\*Source:\*\*[^\n]*TX-(\d{4}|#{4})/,
        `${rel}:${i + 1} documents a rule source that does not cite a TX id: "${line.trim()}"`);
    });
  }
});
