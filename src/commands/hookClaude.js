import fs from 'fs';
import path from 'path';
import { ROOT_DIR, SESSION_FILE_NAME } from '../utils/constants.js';
import { findGitRoot, findPmRoot } from '../utils/project.js';

// Installer for the Claude Code adapter of the agent-hook layer
// (README, "Agent-Hook Layer"). Merges the four hook registrations into
// the project's .claude/settings.json without touching unrelated entries.

const HOOK_EVENTS = [
  { event: 'SessionStart', arg: 'session-start' },
  { event: 'Stop', arg: 'stop' },
  { event: 'PostToolUse', arg: 'post-write', matcher: 'Write|Edit' },
  { event: 'PreToolUse', arg: 'pre-read', matcher: 'Read' }
];

// Registers one event, returning what it did: 'added', 'kept', or 'refreshed'.
// Refresh matters because the command embeds this installation's absolute
// path: once the installation moves, the old entry fails on every event, and
// treating "an entry exists" as "nothing to do" left it broken forever.
function installHook(groups, arg, matcher, command) {
  for (const group of groups) {
    if (!Array.isArray(group.hooks)) continue;
    for (const hook of group.hooks) {
      if (typeof hook.command !== 'string' || !hook.command.includes(`hook-event ${arg}`)) continue;
      if (hook.command === command) return 'kept';
      hook.command = command;
      return 'refreshed';
    }
  }

  const group = { hooks: [{ type: 'command', command }] };
  if (matcher) group.matcher = matcher;
  groups.push(group);
  return 'added';
}

// The ephemeral session state file must never be committed. Only an existing
// .gitignore is appended to — creating one in a repository that deliberately
// has none would be an unrelated change to the user's project.
function ensureSessionIgnored(projectRoot, pmDir) {
  const relSession = `${path.basename(pmDir)}/${SESSION_FILE_NAME}`;
  const gitignorePath = path.join(projectRoot, '.gitignore');

  let gitignore;
  try {
    gitignore = fs.readFileSync(gitignorePath, 'utf8');
  } catch (err) {
    console.log(`Hint: add "${relSession}" to your .gitignore (ephemeral session state).`);
    return;
  }
  if (gitignore.includes(SESSION_FILE_NAME)) return;

  const separator = gitignore.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(gitignorePath, `${separator}\n# ProMem ephemeral session state (agent-hook layer)\n${relSession}\n`);
  console.log(`Added "${relSession}" to .gitignore (ephemeral session state).`);
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
  const outcomes = { added: [], kept: [], refreshed: [] };

  for (const { event, arg, matcher } of HOOK_EVENTS) {
    if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
    const command = `node "${pmJsPath}" hook-event ${arg}`;
    outcomes[installHook(settings.hooks[event], arg, matcher, command)].push(arg);
  }

  const brain = findPmRoot(projectRoot);

  if (outcomes.added.length === 0 && outcomes.refreshed.length === 0) {
    console.log('ProMem Claude hooks are already installed in .claude/settings.json');
    if (brain) ensureSessionIgnored(projectRoot, brain.pmDir);
    return;
  }

  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

  if (outcomes.added.length > 0) console.log(`Installed ProMem hooks (${outcomes.added.join(', ')}) into ${settingsPath}`);
  if (outcomes.refreshed.length > 0) console.log(`Repointed at this installation (${outcomes.refreshed.join(', ')}) — the previous command path was stale.`);
  if (outcomes.kept.length > 0) console.log(`Already present, kept as-is: ${outcomes.kept.join(', ')}`);

  if (brain) ensureSessionIgnored(projectRoot, brain.pmDir);
}
