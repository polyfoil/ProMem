import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PM_JS_PATH = path.join(__dirname, '..', 'pm.js');

function freshDir(name) {
  const dir = path.join(__dirname, name);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  // Isolation boundary: an empty .git dir marks the fixture as its own
  // repository, so brain resolution never escapes into the real project.
  fs.mkdirSync(path.join(dir, '.git'));
  return dir;
}

function cleanup(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function hookEvent(cwd, event, input = '{}') {
  return spawnSync('node', [PM_JS_PATH, 'hook-event', event], { cwd, input });
}

function readState(projectDir) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, '.pm', '.session.json'), 'utf8'));
}

function writeState(projectDir, state) {
  fs.writeFileSync(path.join(projectDir, '.pm', '.session.json'), JSON.stringify(state));
}

test('pm hook claude installs and merges .claude/settings.json', async (t) => {
  const projectDir = freshDir('temp-hookclaude-project');
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');

  await t.test('fresh project: settings.json is created with all four events', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'hook', 'claude'], { cwd: projectDir });
    assert.strictEqual(result.status, 0, 'installer should succeed');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const event of ['SessionStart', 'Stop', 'PostToolUse', 'PreToolUse']) {
      assert.ok(Array.isArray(settings.hooks[event]) && settings.hooks[event].length > 0, `${event} must be registered`);
    }
    const postWrite = settings.hooks.PostToolUse.find(g => JSON.stringify(g).includes('hook-event post-write'));
    assert.strictEqual(postWrite.matcher, 'Write|Edit', 'post-write must be scoped to Write|Edit');
    const preRead = settings.hooks.PreToolUse.find(g => JSON.stringify(g).includes('hook-event pre-read'));
    assert.strictEqual(preRead.matcher, 'Read', 'pre-read must be scoped to Read');
  });

  await t.test('a second run is idempotent (no duplicate registrations)', () => {
    const result = spawnSync('node', [PM_JS_PATH, 'hook', 'claude'], { cwd: projectDir });
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.toString().includes('already installed'), 'second install should be detected');
    const raw = fs.readFileSync(settingsPath, 'utf8');
    assert.strictEqual(raw.split('hook-event session-start').length - 1, 1, 'session-start must be registered exactly once');
  });

  await t.test('pre-existing unrelated settings and hooks are preserved', () => {
    const existing = {
      permissions: { allow: ['Bash(npm test)'] },
      hooks: {
        PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'echo user-hook' }] }]
      }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(existing));

    const result = spawnSync('node', [PM_JS_PATH, 'hook', 'claude'], { cwd: projectDir });
    assert.strictEqual(result.status, 0);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.deepStrictEqual(settings.permissions, existing.permissions, 'unrelated top-level keys must survive');
    assert.ok(JSON.stringify(settings.hooks.PostToolUse).includes('echo user-hook'), 'the user hook must survive the merge');
    assert.ok(JSON.stringify(settings.hooks.PostToolUse).includes('hook-event post-write'), 'the ProMem hook must be added alongside');
  });

  await t.test('corrupt settings.json aborts without clobbering', () => {
    fs.writeFileSync(settingsPath, '{ not json');
    const result = spawnSync('node', [PM_JS_PATH, 'hook', 'claude'], { cwd: projectDir });
    assert.notStrictEqual(result.status, 0, 'installer must refuse on unparseable settings');
    assert.strictEqual(fs.readFileSync(settingsPath, 'utf8'), '{ not json', 'the broken file must be left untouched');
  });

  cleanup(projectDir);
});

test('hook-event session-start injects context and resets session state', async (t) => {
  const projectDir = freshDir('temp-hook-session-project');
  spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });

  await t.test('emits last TX, Cerebrum titles, protocol pointer — under 40 lines', () => {
    const result = hookEvent(projectDir, 'session-start');
    assert.strictEqual(result.status, 0);

    const out = result.stdout.toString();
    assert.match(out, /Last handoff: - \[TX-0001/, 'the last Memory TX line must be injected');
    assert.ok(out.includes('Coding Standards'), 'Cerebrum section titles must be listed');
    assert.ok(out.includes('read Brief.md and Cerebrum.md'), 'the protocol pointer must be present');
    assert.ok(out.trim().split('\n').length < 40, 'injected context must stay under 40 lines');
  });

  await t.test('writes a fresh session state file', () => {
    const state = readState(projectDir);
    assert.ok(!Number.isNaN(Date.parse(state.started)), 'started must be a valid timestamp');
    assert.deepStrictEqual(state.edits, [], 'a new session starts with no edits');
    assert.strictEqual(state.stale, false);
  });

  await t.test('without a brain: one-line notice, exit 0', () => {
    const bare = freshDir('temp-hook-nobrain');
    const result = hookEvent(bare, 'session-start');
    assert.strictEqual(result.status, 0, 'no brain must not fail the hook');
    assert.ok(result.stdout.toString().includes('no .pm brain'), 'the notice should point at pm init');
    cleanup(bare);
  });

  cleanup(projectDir);
});

test('hook-event post-write tracks project edits, ignores brain paths', async (t) => {
  const projectDir = freshDir('temp-hook-postwrite-project');
  spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });
  hookEvent(projectDir, 'session-start');

  await t.test('a project file edit is recorded and marks the brain stale', () => {
    const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: path.join(projectDir, 'src', 'foo.js') } });
    const result = hookEvent(projectDir, 'post-write', payload);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.toString().trim(), '', 'post-write must be silent');

    const state = readState(projectDir);
    assert.deepStrictEqual(state.edits, ['src/foo.js'], 'the edit must be recorded project-relative');
    assert.strictEqual(state.stale, true);
  });

  await t.test('the same path is not recorded twice', () => {
    const payload = JSON.stringify({ tool_input: { file_path: path.join(projectDir, 'src', 'foo.js') } });
    hookEvent(projectDir, 'post-write', payload);
    assert.deepStrictEqual(readState(projectDir).edits, ['src/foo.js']);
  });

  await t.test('brain-internal paths are ignored', () => {
    const payload = JSON.stringify({ tool_input: { file_path: path.join(projectDir, '.pm', '04_Execution', 'Memory.md') } });
    const result = hookEvent(projectDir, 'post-write', payload);
    assert.strictEqual(result.status, 0);
    assert.deepStrictEqual(readState(projectDir).edits, ['src/foo.js'], 'brain edits are not project edits');
  });

  cleanup(projectDir);
});

test('hook-event stop: handoff reminder, cerebrum nudge, freshness repair', async (t) => {
  const projectDir = freshDir('temp-hook-stop-project');
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'stop-fixture' }));
  spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });
  const memoryPath = path.join(projectDir, '.pm', '04_Execution', 'Memory.md');

  await t.test('reminds when edits exist but no TX was logged this session', () => {
    // Age the only TX so it is unambiguously older than the session start.
    fs.writeFileSync(memoryPath, fs.readFileSync(memoryPath, 'utf8').replace(/\| \d{4}-\d{2}-\d{2} \d{2}:\d{2} \|/, '| 2020-01-01 00:00 |'));
    writeState(projectDir, { started: new Date().toISOString(), edits: ['src/foo.js'], stale: false });

    const result = hookEvent(projectDir, 'stop');
    assert.strictEqual(result.status, 0, 'stop must never prevent session end');
    assert.ok(result.stderr.toString().includes('no Memory TX logged'), 'the handoff reminder must fire');
    assert.ok(result.stderr.toString().includes('1 file(s)'), 'the reminder should carry the edit count');
  });

  await t.test('silent when a TX was logged after session start', () => {
    writeState(projectDir, { started: '2020-06-01T00:00:00.000Z', edits: ['src/foo.js'], stale: false });
    spawnSync('node', [PM_JS_PATH, 'memory', 'work logged', '-a', 'HookTestAgent'], { cwd: projectDir });

    const result = hookEvent(projectDir, 'stop');
    assert.strictEqual(result.status, 0);
    assert.ok(!result.stderr.toString().includes('no Memory TX logged'), 'no reminder once the handoff exists');
  });

  await t.test('silent when there were no edits', () => {
    writeState(projectDir, { started: new Date().toISOString(), edits: [], stale: false });
    const result = hookEvent(projectDir, 'stop');
    assert.strictEqual(result.status, 0);
    assert.ok(!result.stderr.toString().includes('no Memory TX logged'));
  });

  await t.test('nudges about Cerebrum after 3+ edits when Cerebrum was not touched', () => {
    const cerebrumPath = path.join(projectDir, '.pm', '04_Execution', 'Cerebrum.md');
    const past = (Date.now() - 60 * 60 * 1000) / 1000;
    fs.utimesSync(cerebrumPath, past, past);
    // started = now: Cerebrum (touched an hour ago) predates this session.
    writeState(projectDir, { started: new Date().toISOString(), edits: ['a.js', 'b.js', 'c.js'], stale: false });

    const result = hookEvent(projectDir, 'stop');
    assert.strictEqual(result.status, 0);
    assert.ok(result.stderr.toString().includes('Cerebrum.md'), 'the gentle Cerebrum nudge must fire');
  });

  await t.test('runs the update repair exactly once when stale', () => {
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'stop-fixture', dependencies: { fastify: '^4.0.0' } }));
    writeState(projectDir, { started: '2020-06-01T00:00:00.000Z', edits: ['src/foo.js'], stale: true });

    const first = hookEvent(projectDir, 'stop');
    assert.strictEqual(first.status, 0);
    const archPath = path.join(projectDir, '.pm', '03_Specifications', 'Architecture.md');
    assert.ok(fs.readFileSync(archPath, 'utf8').includes('fastify'), 'the stale brain must be refreshed');
    assert.strictEqual(readState(projectDir).stale, false, 'the stale flag must be cleared');

    // A second stop (no longer stale) must not run update again.
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'stop-fixture', dependencies: { koa: '^2.0.0' } }));
    const second = hookEvent(projectDir, 'stop');
    assert.strictEqual(second.status, 0);
    assert.ok(!fs.readFileSync(archPath, 'utf8').includes('koa'), 'update must not run when the state is not stale');
  });

  cleanup(projectDir);
});

test('hook-event pre-read surfaces the anatomy card', async (t) => {
  const projectDir = freshDir('temp-hook-preread-project');
  spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });
  const anatomyPath = path.join(projectDir, '.pm', '04_Execution', 'Anatomy.md');
  fs.appendFileSync(anatomyPath, '\n| src/auth.js | JWT session validation |\n- `src/db.js` — connection pool setup\n');

  await t.test('an annotated Key Files row is printed to stderr', () => {
    const payload = JSON.stringify({ tool_input: { file_path: path.join(projectDir, 'src', 'auth.js') } });
    const result = hookEvent(projectDir, 'pre-read', payload);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stderr.toString().includes('ProMem anatomy: src/auth.js — JWT session validation'));
  });

  await t.test('a Module Map bullet is also found', () => {
    const payload = JSON.stringify({ tool_input: { file_path: path.join(projectDir, 'src', 'db.js') } });
    const result = hookEvent(projectDir, 'pre-read', payload);
    assert.ok(result.stderr.toString().includes('connection pool setup'));
  });

  await t.test('unknown and pending-annotation files stay silent', () => {
    const payload = JSON.stringify({ tool_input: { file_path: path.join(projectDir, 'src', 'unknown.js') } });
    const result = hookEvent(projectDir, 'pre-read', payload);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stderr.toString().trim(), '', 'no anatomy entry means no output');
  });

  cleanup(projectDir);
});

test('hook-event robustness: every event exits 0 on bad input', async (t) => {
  const projectDir = freshDir('temp-hook-robust-project');
  spawnSync('node', [PM_JS_PATH, 'init'], { cwd: projectDir });
  const events = ['session-start', 'stop', 'post-write', 'pre-read'];

  await t.test('malformed JSON and empty stdin never fail', () => {
    for (const event of events) {
      assert.strictEqual(hookEvent(projectDir, event, '{{{ not json').status, 0, `${event} must survive malformed JSON`);
      assert.strictEqual(hookEvent(projectDir, event, '').status, 0, `${event} must survive empty stdin`);
    }
  });

  await t.test('no brain: every event is a silent no-op with exit 0', () => {
    const bare = freshDir('temp-hook-robust-nobrain');
    for (const event of events) {
      assert.strictEqual(hookEvent(bare, event).status, 0, `${event} must exit 0 without a brain`);
    }
    cleanup(bare);
  });

  await t.test('a held lock degrades to a no-op, exit 0', () => {
    // A lock owned by a live process (this test runner) is never stale.
    fs.writeFileSync(path.join(projectDir, '.pm', '.pm.lock'), `Locked by PID ${process.pid} at ${new Date().toISOString()}\n`);
    const payload = JSON.stringify({ tool_input: { file_path: path.join(projectDir, 'src', 'x.js') } });
    assert.strictEqual(hookEvent(projectDir, 'post-write', payload).status, 0, 'post-write must exit 0 while locked');
    assert.strictEqual(hookEvent(projectDir, 'session-start').status, 0, 'session-start must exit 0 while locked');
    fs.rmSync(path.join(projectDir, '.pm', '.pm.lock'));
  });

  await t.test('unknown event name exits 0 silently', () => {
    assert.strictEqual(hookEvent(projectDir, 'no-such-event').status, 0);
  });

  cleanup(projectDir);
});
