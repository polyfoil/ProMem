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

test('ProMem CLI Integration Tests', async (t) => {
  const originalCwd = process.cwd();
  const testProjectDir = path.join(__dirname, 'temp-test-project');

  // Setup temporary test project directory
  if (fs.existsSync(testProjectDir)) {
    fs.rmSync(testProjectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testProjectDir, { recursive: true });

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
  });

  await t.test('pm memory should append a new formatted handoff entry to Memory.md', () => {
    runMemory('Test feature addition', 'TestAgent');

    const memoryContent = fs.readFileSync(path.join(testProjectDir, '.pm', '04_Execution', 'Memory.md'), 'utf8');
    assert.match(memoryContent, /- \[.* \| Agent: TestAgent\]: Test feature addition/, 'Memory entry should match transaction format');
  });

  await t.test('pm compact should move older entries to Archive and keep ledger clean', () => {
    // Append additional entries to trigger compaction (needs > 10 entries, currently have 2: init + 1st memory)
    for (let i = 1; i <= 10; i++) {
      runMemory(`Task ${i} completed`, 'TestAgent');
    }

    runCompact();

    const memoryContent = fs.readFileSync(path.join(testProjectDir, '.pm', '04_Execution', 'Memory.md'), 'utf8');
    const lines = memoryContent.split('\n').map(l => l.trim()).filter(Boolean);
    const entries = lines.filter(line => line.startsWith('- ['));

    // Memory.md should retain only the last 10 entries
    assert.strictEqual(entries.length, 10, 'Memory.md should only keep the 10 active entries');

    // Archive folder should have an archive file generated
    const archiveFiles = fs.readdirSync(path.join(testProjectDir, '.pm', 'Archive')).filter(f => f.endsWith('.md'));
    assert.strictEqual(archiveFiles.length, 1, 'An archive summary file should be generated in the Archive directory');
  });

  await t.test('pm compact should preserve non-entry content instead of destroying it', () => {
    const memoryPath = path.join(testProjectDir, '.pm', '04_Execution', 'Memory.md');
    const manualNote = 'NOTE: production deploy is frozen until Friday.';
    fs.appendFileSync(memoryPath, `\n${manualNote}\n`);

    for (let i = 11; i <= 21; i++) {
      runMemory(`Task ${i} completed`, 'TestAgent');
    }
    runCompact();

    const memoryContent = fs.readFileSync(memoryPath, 'utf8');
    assert.ok(memoryContent.includes(manualNote), 'Manual non-entry notes must survive compaction');
  });

  await t.test('pm compact should append to the same-day archive, not overwrite it', () => {
    const archiveDir = path.join(testProjectDir, '.pm', 'Archive');
    const archiveFile = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md'))[0];
    const archiveBefore = fs.readFileSync(path.join(archiveDir, archiveFile), 'utf8');
    const entriesBefore = archiveBefore.split('\n').filter(l => l.trim().startsWith('- [')).length;

    for (let i = 22; i <= 32; i++) {
      runMemory(`Task ${i} completed`, 'TestAgent');
    }
    runCompact();

    const archiveFiles = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md'));
    assert.strictEqual(archiveFiles.length, 1, 'Same-day compaction should reuse the daily archive file');

    const archiveAfter = fs.readFileSync(path.join(archiveDir, archiveFiles[0]), 'utf8');
    const entriesAfter = archiveAfter.split('\n').filter(l => l.trim().startsWith('- [')).length;
    assert.ok(entriesAfter > entriesBefore, 'Second compaction must append to the archive, not overwrite it');
    assert.ok(archiveAfter.includes('Task 1 completed'), 'Entries from the first compaction must still be in the archive');
  });

  // Teardown and restore process directory context
  process.chdir(originalCwd);
  if (fs.existsSync(testProjectDir)) {
    fs.rmSync(testProjectDir, { recursive: true, force: true });
  }
});

test('TODO scanner precision', async (t) => {
  const originalCwd = process.cwd();
  const scanProjectDir = path.join(__dirname, 'temp-scan-project');

  if (fs.existsSync(scanProjectDir)) {
    fs.rmSync(scanProjectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(scanProjectDir, { recursive: true });

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
  if (fs.existsSync(scanProjectDir)) {
    fs.rmSync(scanProjectDir, { recursive: true, force: true });
  }
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

  fs.rmSync(emptyPmProjectDir, { recursive: true, force: true });
});

test('pm update (subprocess): errors cleanly without .pm/, refreshes after init', async (t) => {
  const updateProjectDir = path.join(__dirname, 'temp-update-subprocess');
  if (fs.existsSync(updateProjectDir)) {
    fs.rmSync(updateProjectDir, { recursive: true, force: true });
  }
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

  if (fs.existsSync(updateProjectDir)) {
    fs.rmSync(updateProjectDir, { recursive: true, force: true });
  }
});

test('detectTechStack recognizes non-Node ecosystems', async (t) => {
  const fixtureRoot = path.join(__dirname, 'temp-stack-fixture');
  if (fs.existsSync(fixtureRoot)) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(fixtureRoot, { recursive: true });

  await t.test('Go: reads version from go.mod', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'go.mod'), 'module example.com/app\n\ngo 1.22\n');
    const stack = detectTechStack(fixtureRoot);
    const go = stack.find(s => s.technology === 'Go');
    assert.ok(go, 'Go should be detected');
    assert.strictEqual(go.version, '1.22');
    fs.rmSync(path.join(fixtureRoot, 'go.mod'));
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

  fs.rmSync(fixtureRoot, { recursive: true, force: true });
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
    const projectDir = path.join(__dirname, 'temp-cli-args-project');
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });
    spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });

    spawnSync('node', [PM_JS_PATH, 'memory', 'short flag test', '-a', 'ShortFlagAgent'], { cwd: projectDir });
    spawnSync('node', [PM_JS_PATH, 'memory', 'long flag test', '--agent', 'LongFlagAgent'], { cwd: projectDir });

    const memoryContent = fs.readFileSync(path.join(projectDir, '.pm', '04_Execution', 'Memory.md'), 'utf8');
    assert.match(memoryContent, /Agent: ShortFlagAgent\]: short flag test/, '-a should set the agent name');
    assert.match(memoryContent, /Agent: LongFlagAgent\]: long flag test/, '--agent should set the agent name');

    fs.rmSync(projectDir, { recursive: true, force: true });
  });
});
