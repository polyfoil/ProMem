import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { runInit, runUpdate, runMemory, runCompact, detectTechStack, loadTemplate } from '../pm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PM_JS_PATH = path.join(__dirname, '..', 'pm.js');

function freshDir(name) {
  const dir = path.join(__dirname, name);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('ProMem CLI Integration Tests', async (t) => {
  const originalCwd = process.cwd();
  const testProjectDir = freshDir('temp-test-project');
  const memoryPath = path.join(testProjectDir, '.pm', '04_Execution', 'Memory.md');
  const archiveDir = path.join(testProjectDir, '.pm', 'Archive');

  // Switch directory context for pm.js execution
  process.chdir(testProjectDir);

  await t.test('pm init should create the .pm directory structure and rule entrypoints', () => {
    runInit();

    const pmDir = path.join(testProjectDir, '.pm');
    assert.ok(fs.existsSync(pmDir), '.pm directory should exist');
    assert.ok(fs.existsSync(path.join(pmDir, '01_Foundations', 'Brief.md')), 'Brief.md should exist');
    assert.ok(fs.existsSync(path.join(pmDir, '03_Specifications', 'Architecture.md')), 'Architecture.md should exist');
    assert.ok(fs.existsSync(path.join(pmDir, '04_Execution', 'Anatomy.md')), 'Anatomy.md should exist');
    assert.ok(fs.existsSync(path.join(pmDir, '04_Execution', 'Memory.md')), 'Memory.md should exist');
    assert.ok(fs.existsSync(path.join(pmDir, '04_Execution', 'Buglog.md')), 'Buglog.md should exist');
    assert.ok(fs.existsSync(path.join(testProjectDir, '.cursorrules')), '.cursorrules should be generated at root');
    assert.ok(fs.existsSync(path.join(testProjectDir, 'CLAUDE.md')), 'CLAUDE.md should be generated at root');

    const memoryContent = fs.readFileSync(memoryPath, 'utf8');
    assert.match(memoryContent, /- \[TX-0001 \| .* \| Agent: pm-cli\]:/, 'Init entry should carry the first transaction id');
  });

  await t.test('pm memory should append a TX-numbered handoff entry to Memory.md', () => {
    runMemory('Test feature addition', 'TestAgent');

    const memoryContent = fs.readFileSync(memoryPath, 'utf8');
    assert.match(memoryContent, /- \[TX-0002 \| .* \| Agent: TestAgent\]: Test feature addition/, 'Memory entry should match the TX transaction format');
  });

  await t.test('pm memory should flatten multi-line messages into a single ledger line', () => {
    runMemory('first line\nsecond line', 'TestAgent');

    const memoryContent = fs.readFileSync(memoryPath, 'utf8');
    assert.ok(memoryContent.includes('first line second line'), 'Newlines in the message should be flattened to spaces');
    assert.ok(!memoryContent.includes('first line\nsecond line'), 'The raw multi-line message must not reach the ledger');
  });

  await t.test('pm compact should stage the full ledger into a pending archive and reset Memory.md', () => {
    const manualNote = 'NOTE: production deploy is frozen until Friday.';
    fs.appendFileSync(memoryPath, `\n${manualNote}\n`);

    for (let i = 1; i <= 10; i++) {
      runMemory(`Task ${i} completed`, 'TestAgent');
    }

    runCompact();

    const memoryContent = fs.readFileSync(memoryPath, 'utf8');
    const entries = memoryContent.split('\n').filter(l => l.trim().startsWith('- ['));
    assert.strictEqual(entries.length, 0, 'The reset Memory.md should contain no transaction entries');
    assert.ok(memoryContent.includes('compaction is pending'), 'The reset Memory.md should carry the agent directive');
    assert.ok(memoryContent.includes('pm-compact skill'), 'The directive should point the agent to the pm-compact skill');

    const pendingFiles = fs.readdirSync(archiveDir).filter(f => f.endsWith('_Memory_Pending.md'));
    assert.strictEqual(pendingFiles.length, 1, 'Exactly one pending archive file should exist');

    const archived = fs.readFileSync(path.join(archiveDir, pendingFiles[0]), 'utf8');
    assert.ok(archived.includes('Task 1 completed'), 'All ledger entries must be preserved in the pending archive');
    assert.ok(archived.includes('Test feature addition'), 'Earlier entries must be preserved in the pending archive');
    assert.ok(archived.includes(manualNote), 'Manual non-entry notes must be preserved in the pending archive');
  });

  await t.test('pm compact should refuse to run while a compaction is already pending', () => {
    const memoryBefore = fs.readFileSync(memoryPath, 'utf8');

    runCompact();

    const memoryAfter = fs.readFileSync(memoryPath, 'utf8');
    assert.strictEqual(memoryAfter, memoryBefore, 'Memory.md must not change while a compaction is pending');

    const pendingFiles = fs.readdirSync(archiveDir).filter(f => f.endsWith('_Memory_Pending.md'));
    assert.strictEqual(pendingFiles.length, 1, 'No second pending archive may be created');
  });

  await t.test('TX numbering stays monotonic across compactions (archive is scanned)', () => {
    const pendingFile = fs.readdirSync(archiveDir).filter(f => f.endsWith('_Memory_Pending.md'))[0];
    const archived = fs.readFileSync(path.join(archiveDir, pendingFile), 'utf8');
    let maxTx = 0;
    // Same line-anchored pattern the ledger uses: documentation examples
    // (e.g. the format comment in the template header) must not count.
    for (const match of archived.matchAll(/^\s*- \[TX-(\d+)/gm)) {
      maxTx = Math.max(maxTx, Number(match[1]));
    }
    assert.ok(maxTx >= 12, 'Sanity: the archive should contain the earlier transactions');

    runMemory('post-compact entry', 'TestAgent');

    const memoryContent = fs.readFileSync(memoryPath, 'utf8');
    const expectedTx = `TX-${String(maxTx + 1).padStart(4, '0')}`;
    assert.ok(memoryContent.includes(`[${expectedTx} `), `The next entry should continue the sequence (${expectedTx}), not restart at TX-0001`);
  });

  // Teardown and restore process directory context
  process.chdir(originalCwd);
  cleanup(testProjectDir);
});

test('pm init leaves existing entrypoint files untouched', async (t) => {
  const projectDir = freshDir('temp-entrypoints-project');
  const claudeMdPath = path.join(projectDir, 'CLAUDE.md');
  const userRules = '# MY CUSTOM RULES\n\n- never touch this file\n';
  fs.writeFileSync(claudeMdPath, userRules);

  await t.test('existing CLAUDE.md is preserved byte-for-byte, missing .cursorrules is created', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });
    assert.strictEqual(result.status, 0, 'pm init should succeed');

    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8'), userRules, 'Existing CLAUDE.md must not be modified');
    assert.ok(result.stdout.toString().includes('left untouched'), 'The user should be told the file was left untouched');
    assert.ok(fs.existsSync(path.join(projectDir, '.cursorrules')), 'Missing .cursorrules should still be generated');
    assert.ok(!fs.existsSync(path.join(projectDir, 'AGENTS.md')), 'AGENTS.md should not be created when absent');
  });

  cleanup(projectDir);
});

test('project scanning respects simple .gitignore directory patterns', async (t) => {
  const projectDir = freshDir('temp-gitignore-project');
  fs.writeFileSync(path.join(projectDir, '.gitignore'), 'private/\n*.log\n# comment\n');
  fs.mkdirSync(path.join(projectDir, 'private'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'private', 'secret.js'), 'export const key = 1;\n');
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'src', 'app.js'), 'export const app = 1;\n');

  await t.test('gitignored directories are excluded from the Anatomy index', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });
    assert.strictEqual(result.status, 0, 'pm init should succeed');

    const anatomy = fs.readFileSync(path.join(projectDir, '.pm', '04_Execution', 'Anatomy.md'), 'utf8');
    assert.ok(!anatomy.includes('secret.js'), 'Files inside gitignored directories must not be indexed');
    assert.ok(anatomy.includes('src/app.js'), 'Regular source files should still be indexed');
  });

  cleanup(projectDir);
});

test('pm status auto-repairs missing structure and reports pending compactions', async (t) => {
  const projectDir = freshDir('temp-status-project');
  spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });

  await t.test('missing Archive/ and Memory.md are recreated', () => {
    fs.rmSync(path.join(projectDir, '.pm', 'Archive'), { recursive: true, force: true });
    fs.rmSync(path.join(projectDir, '.pm', '04_Execution', 'Memory.md'), { force: true });

    const result = spawnSync('node', [PM_JS_PATH, 'status'], { cwd: projectDir });
    assert.strictEqual(result.status, 0, 'pm status should succeed');
    assert.ok(fs.existsSync(path.join(projectDir, '.pm', 'Archive')), 'Archive directory should be recreated');
    const memory = fs.readFileSync(path.join(projectDir, '.pm', '04_Execution', 'Memory.md'), 'utf8');
    assert.ok(memory.includes('# Memory — Shift Ledger'), 'Recovered Memory.md should carry the standard header');
    assert.match(memory, /- \[TX-\d{4} \| .* \| Agent: pm-cli\]: Auto-recovered Memory.md/, 'Recovery entry should use the TX transaction format');
  });

  await t.test('a pending compaction file triggers a warning', () => {
    fs.writeFileSync(path.join(projectDir, '.pm', 'Archive', '2026-01-01_Memory_Pending.md'), '# Memory — Shift Ledger\n');

    const result = spawnSync('node', [PM_JS_PATH, 'status'], { cwd: projectDir });
    assert.strictEqual(result.status, 0, 'pm status should succeed');
    assert.ok(result.stderr.toString().includes('Pending compaction found'), 'Status should surface the pending compaction to the agent');
  });

  cleanup(projectDir);
});

test('pm hook installs a post-commit hook with an absolute-path fallback', async (t) => {
  const projectDir = freshDir('temp-hook-project');
  const gitInit = spawnSync('git', ['init'], { cwd: projectDir });
  assert.strictEqual(gitInit.status, 0, 'git init should succeed');

  await t.test('the hook script embeds the ProMem installation path', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'hook'], { cwd: projectDir });
    assert.strictEqual(result.status, 0, 'pm hook should succeed');

    const hookPath = path.join(projectDir, '.git', 'hooks', 'post-commit');
    assert.ok(fs.existsSync(hookPath), 'post-commit hook should be created');

    const content = fs.readFileSync(hookPath, 'utf8');
    const expectedPmJs = PM_JS_PATH.replace(/\\/g, '/');
    assert.ok(content.includes(`"${expectedPmJs}"`), 'The hook must embed the absolute pm.js path (forward slashes) as fallback');
    assert.ok(content.includes('command -v pm'), 'The hook should prefer the globally linked pm command');
  });

  await t.test('running pm hook twice does not duplicate the hook', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'hook'], { cwd: projectDir });
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.toString().includes('already installed'), 'A second install should be detected and skipped');
  });

  cleanup(projectDir);
});

test('TODO scanner precision', async (t) => {
  const originalCwd = process.cwd();
  const scanProjectDir = freshDir('temp-scan-project');

  // Comment TODO → should be reported
  fs.writeFileSync(path.join(scanProjectDir, 'app.js'), [
    '// TODO: refactor the session handler',
    'const BUG_TRACKER_URL = "https://example.com"; // identifier, keyword not in a comment before it',
    'export const x = 1;'
  ].join('\n'));
  // Prose "bug"/"todo" in markdown → must NOT be reported (.md is not scanned)
  fs.writeFileSync(path.join(scanProjectDir, 'README.md'), 'This project fixes a bug in the todo list.\n');

  process.chdir(scanProjectDir);

  await t.test('init reports comment TODOs only, with ISSUE- ids', () => {
    runInit();

    const buglog = fs.readFileSync(path.join(scanProjectDir, '.pm', '04_Execution', 'Buglog.md'), 'utf8');
    const issueRows = buglog.split('\n').filter(l => l.includes('| ISSUE-'));
    assert.strictEqual(issueRows.length, 1, 'Exactly one comment-based TODO should be reported');
    assert.ok(issueRows[0].includes('refactor the session handler'), 'The reported issue should be the comment TODO');
    assert.ok(!buglog.includes('BUG-0'), 'Old BUG- id prefix should no longer be used');
  });

  process.chdir(originalCwd);
  cleanup(scanProjectDir);
});

test('pm update (in-process) is a no-op when Architecture.md/Anatomy.md are absent', async (t) => {
  const originalCwd = process.cwd();
  const emptyPmProjectDir = path.join(__dirname, 'temp-update-noop-project');
  if (fs.existsSync(emptyPmProjectDir)) {
    fs.rmSync(emptyPmProjectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(emptyPmProjectDir, '.pm', '03_Specifications'), { recursive: true });
  fs.mkdirSync(path.join(emptyPmProjectDir, '.pm', '04_Execution'), { recursive: true });

  process.chdir(emptyPmProjectDir);
  await t.test('runs without throwing and reports nothing to update', () => {
    assert.doesNotThrow(() => runUpdate());
  });
  process.chdir(originalCwd);

  cleanup(emptyPmProjectDir);
});

test('pm update (subprocess): errors cleanly without .pm/, refreshes after init', async (t) => {
  const updateProjectDir = freshDir('temp-update-subprocess');
  fs.mkdirSync(path.join(updateProjectDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(updateProjectDir, 'package.json'), JSON.stringify({ name: 'update-fixture', engines: { node: '>=20' } }));
  fs.writeFileSync(path.join(updateProjectDir, 'src', 'index.js'), 'export const x = 1;\n');

  await t.test('exits non-zero when .pm/ is missing', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'update'], { cwd: updateProjectDir });
    assert.notStrictEqual(result.status, 0, 'pm update should fail without .pm/');
  });

  await t.test('after init, pm update picks up new deps/files while preserving manual notes', () => {
    const initResult = spawnSync('node', [PM_JS_PATH, 'init'], { cwd: updateProjectDir });
    assert.strictEqual(initResult.status, 0, 'pm init should succeed');

    const archPath = path.join(updateProjectDir, '.pm', '03_Specifications', 'Architecture.md');
    const anatomyPath = path.join(updateProjectDir, '.pm', '04_Execution', 'Anatomy.md');

    // Simulate a manual annotation an agent would have added under Key Design Decisions.
    let archContent = fs.readFileSync(archPath, 'utf8');
    archContent = archContent.replace('## Key Design Decisions', '## Key Design Decisions\n- MANUAL: chose SQLite for simplicity');
    fs.writeFileSync(archPath, archContent);

    // Change the project: add a dependency and a new file under src/.
    fs.writeFileSync(path.join(updateProjectDir, 'package.json'), JSON.stringify({ name: 'update-fixture', engines: { node: '>=20' }, dependencies: { zod: '^3.0.0' } }));
    fs.writeFileSync(path.join(updateProjectDir, 'src', 'newfile.js'), 'export const y = 2;\n');

    const updateResult = spawnSync('node', [PM_JS_PATH, 'update'], { cwd: updateProjectDir });
    assert.strictEqual(updateResult.status, 0, 'pm update should succeed once .pm/ exists');

    const archAfter = fs.readFileSync(archPath, 'utf8');
    const anatomyAfter = fs.readFileSync(anatomyPath, 'utf8');

    assert.ok(archAfter.includes('zod'), 'Tech Stack should include the newly added dependency');
    assert.ok(archAfter.includes('MANUAL: chose SQLite for simplicity'), 'Manual Key Design Decisions content must survive pm update');
    assert.ok(anatomyAfter.includes('src/newfile.js'), 'Anatomy Key Files should include the new src/ file (Windows path-separator safe)');
  });

  cleanup(updateProjectDir);
});

test('detectTechStack recognizes non-Node ecosystems', async (t) => {
  const fixtureRoot = freshDir('temp-stack-fixture');

  await t.test('Go: reads version from go.mod', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'go.mod'), 'module example.com/app\n\ngo 1.22\n');
    const stack = detectTechStack(fixtureRoot);
    const go = stack.find(s => s.technology === 'Go');
    assert.ok(go, 'Go should be detected');
    assert.strictEqual(go.version, '1.22');
    fs.rmSync(path.join(fixtureRoot, 'go.mod'));
  });

  await t.test('Python: reads requires-python from pyproject.toml instead of guessing', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'pyproject.toml'), '[project]\nname = "app"\nrequires-python = ">=3.12"\ndependencies = [\n  "requests",\n]\n');
    const stack = detectTechStack(fixtureRoot);
    const python = stack.find(s => s.technology === 'Python');
    assert.ok(python, 'Python should be detected');
    assert.strictEqual(python.version, '>=3.12', 'The declared requires-python must be used');
    assert.ok(stack.some(s => s.technology === 'requests'), 'pyproject dependencies should be listed');
    fs.rmSync(path.join(fixtureRoot, 'pyproject.toml'));
  });

  await t.test('Python: reports Unknown when pyproject.toml declares no requires-python', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'pyproject.toml'), '[project]\nname = "app"\n');
    const stack = detectTechStack(fixtureRoot);
    const python = stack.find(s => s.technology === 'Python');
    assert.strictEqual(python.version, 'Unknown', 'No version must be fabricated');
    fs.rmSync(path.join(fixtureRoot, 'pyproject.toml'));
  });

  await t.test('Rust: reads crate dependencies from Cargo.toml', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'Cargo.toml'), '[package]\nname = "app"\n\n[dependencies]\nserde = "1.0"\n');
    const stack = detectTechStack(fixtureRoot);
    assert.ok(stack.some(s => s.technology === 'Rust'), 'Rust should be detected');
    assert.ok(stack.some(s => s.technology === 'serde'), 'Cargo dependency should be listed');
    fs.rmSync(path.join(fixtureRoot, 'Cargo.toml'));
  });

  await t.test('PHP: reads require deps from composer.json', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'composer.json'), JSON.stringify({ require: { 'monolog/monolog': '^3.0' } }));
    const stack = detectTechStack(fixtureRoot);
    assert.ok(stack.some(s => s.technology === 'PHP'), 'PHP should be detected');
    assert.ok(stack.some(s => s.technology === 'monolog/monolog'), 'Composer dependency should be listed');
    fs.rmSync(path.join(fixtureRoot, 'composer.json'));
  });

  await t.test('Marker ecosystems: .NET / Java-JVM / Ruby detected by filename only', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'app.csproj'), '<Project></Project>');
    fs.writeFileSync(path.join(fixtureRoot, 'pom.xml'), '<project></project>');
    fs.writeFileSync(path.join(fixtureRoot, 'Gemfile'), 'source "https://rubygems.org"\n');
    const stack = detectTechStack(fixtureRoot);
    assert.ok(stack.some(s => s.technology === '.NET / C#'), '.NET should be detected from .csproj');
    assert.ok(stack.some(s => s.technology === 'Java / JVM'), 'JVM should be detected from pom.xml');
    assert.ok(stack.some(s => s.technology === 'Ruby'), 'Ruby should be detected from Gemfile');
  });

  await t.test('Node engines.node is used instead of the host machine node version', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'package.json'), JSON.stringify({ name: 'x', engines: { node: '>=22.0.0' } }));
    const stack = detectTechStack(fixtureRoot);
    const node = stack.find(s => s.technology === 'Node.js');
    assert.strictEqual(node.version, '>=22.0.0', 'Should read the declared engines.node, not process.version');
    fs.rmSync(path.join(fixtureRoot, 'package.json'));
  });

  cleanup(fixtureRoot);
});

test('loadTemplate falls back to provided default when template file is missing', () => {
  const fallback = '# Fallback Content\n';
  const content = loadTemplate('this/path/does/not/exist.md', fallback);
  assert.strictEqual(content, fallback, 'loadTemplate should return the fallback when the template file is absent');
});

test('CLI argument parsing (subprocess)', async (t) => {
  await t.test('no arguments prints usage and exits 0', () => {
    const result = spawnSync('node', [PM_JS_PATH]);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.toString().includes('ProMem CLI Utility'));
  });

  await t.test('unknown command exits non-zero', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'not-a-real-command']);
    assert.notStrictEqual(result.status, 0);
    assert.ok(result.stderr.toString().includes('Unknown command'));
  });

  await t.test('-a and --agent both route to the agent field', () => {
    const projectDir = freshDir('temp-cli-args-project');
    spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });

    spawnSync('node', [PM_JS_PATH, 'memory', 'short flag test', '-a', 'ShortFlagAgent'], { cwd: projectDir });
    spawnSync('node', [PM_JS_PATH, 'memory', 'long flag test', '--agent', 'LongFlagAgent'], { cwd: projectDir });

    const memoryContent = fs.readFileSync(path.join(projectDir, '.pm', '04_Execution', 'Memory.md'), 'utf8');
    assert.match(memoryContent, /Agent: ShortFlagAgent\]: short flag test/, '-a should set the agent name');
    assert.match(memoryContent, /Agent: LongFlagAgent\]: long flag test/, '--agent should set the agent name');

    cleanup(projectDir);
  });
});
