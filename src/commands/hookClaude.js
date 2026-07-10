import fs from 'fs';
import path from 'path';
import { ROOT_DIR, SESSION_FILE_NAME } from '../utils/constants.js';
import { findGitRoot, findPmRoot } from '../utils/project.js';

// Installer for the Claude Code adapter of the agent-hook layer
// (Docs/HOOK-BEHAVIOR-SPEC.md §4). Merges the four hook registrations into
// the project's .claude/settings.json without touching unrelated entries.

const HOOK_EVENTS = [
  { event: 'SessionStart', arg: 'session-start' },
  { event: 'Stop', arg: 'stop' },
  { event: 'PostToolUse', arg: 'post-write', matcher: 'Write|Edit' },
  { event: 'PreToolUse', arg: 'pre-read', matcher: 'Read' }
];

function alreadyInstalled(groups, arg) {
  return groups.some(group =>
    Array.isArray(group.hooks) &&
    group.hooks.some(h => typeof h.command === 'string' && h.command.includes(`hook-event ${arg}`))
  );
}

export function runHookClaude() {
  const projectRoot = findGitRoot() || process.cwd();
  const settingsDir = path.join(projectRoot, '.claude');
  const settingsPath = path.join(settingsDir, 'settings.json');

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (err) {
      console.error(`Error: ${settingsPath} exists but is not valid JSON. Fix it manually before installing hooks (nothing was changed).`);
      process.exit(1);
    }
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    console.error(`Error: ${settingsPath} does not contain a JSON object. Nothing was changed.`);
    process.exit(1);
  }

  // Same trick as the git post-commit installer: embed the absolute pm.js
  // path (forward slashes) so the hook works even when pm is not on PATH.
  const pmJsPath = path.join(ROOT_DIR, 'pm.js').replace(/\\/g, '/');

  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};
  const added = [];
  const kept = [];

  for (const { event, arg, matcher } of HOOK_EVENTS) {
    if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
    if (alreadyInstalled(settings.hooks[event], arg)) {
      kept.push(arg);
      continue;
    }
    const group = {
      hooks: [{ type: 'command', command: `node "${pmJsPath}" hook-event ${arg}` }]
    };
    if (matcher) group.matcher = matcher;
    settings.hooks[event].push(group);
    added.push(arg);
  }

  if (added.length === 0) {
    console.log('ProMem Claude hooks are already installed in .claude/settings.json');
    return;
  }

  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

  console.log(`Installed ProMem hooks (${added.join(', ')}) into ${settingsPath}`);
  if (kept.length > 0) console.log(`Already present, kept as-is: ${kept.join(', ')}`);

  // The ephemeral session state file should never be committed.
  const brain = findPmRoot(projectRoot);
  if (brain) {
    const relSession = `${path.basename(brain.pmDir)}/${SESSION_FILE_NAME}`;
    let gitignore = '';
    try {
      gitignore = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
    } catch (err) {
      // No .gitignore — still worth the hint.
    }
    if (!gitignore.includes(SESSION_FILE_NAME)) {
      console.log(`Hint: add "${relSession}" to your .gitignore (ephemeral session state).`);
    }
  }
}
