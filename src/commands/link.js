import fs from 'fs';
import path from 'path';
import os from 'os';
import { ROOT_DIR } from '../utils/constants.js';

// Known agent skill roots, relative to the user's home directory. An agent is
// considered "installed" when its base directory (the first segment) exists.
// This list is canonical — the README table mirrors it (see Cerebrum rule).
const AGENT_ROOTS = [
  { agent: 'Claude Code', segments: ['.claude', 'skills'] },
  { agent: 'Codex', segments: ['.codex', 'skills'] },
  { agent: 'Gemini / Antigravity', segments: ['.gemini', 'config', 'skills'] },
  { agent: 'Cursor', segments: ['.cursor', 'skills'] },
  { agent: 'Generic agents', segments: ['.agents', 'skills'] }
];

// 'junction' needs no admin rights on Windows; plain dir symlinks elsewhere.
function createLink(targetDir, linkPath) {
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(targetDir, linkPath, type);
}

// Links die with their target: warn when this installation is a git
// worktree (a .git file), which is typically a temporary checkout.
function warnIfEphemeralSource() {
  try {
    if (fs.statSync(path.join(ROOT_DIR, '.git')).isFile()) {
      console.warn('Warning: this ProMem installation is a git worktree — links will break when the worktree is removed.');
      console.warn('Prefer running "pm link" from your permanent clone.\n');
    }
  } catch (err) {
    // No .git at all (e.g. npm-packaged install) — nothing to warn about.
  }
}

function linkSkillsIntoRoot(skillRoot, skillsSrc, skillDirs) {
  fs.mkdirSync(skillRoot, { recursive: true });
  let created = 0;
  let kept = 0;
  for (const skill of skillDirs) {
    const linkPath = path.join(skillRoot, skill);
    // Non-destructive: never touch an existing entry (link, dir, or file).
    let exists = false;
    try {
      fs.lstatSync(linkPath);
      exists = true;
    } catch (err) {
      exists = false;
    }
    if (exists) {
      kept++;
      continue;
    }
    try {
      createLink(path.join(skillsSrc, skill), linkPath);
      created++;
    } catch (err) {
      console.warn(`  Warning: could not link ${skill} into ${skillRoot}: ${err.message}`);
    }
  }
  return { created, kept };
}

export function runLink() {
  // PROMEM_HOME is an override for tests and unusual setups.
  const home = process.env.PROMEM_HOME || os.homedir();
  const skillsSrc = path.join(ROOT_DIR, 'skills');

  let skillDirs = [];
  try {
    skillDirs = fs.readdirSync(skillsSrc, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch (err) {
    console.error(`Error: could not read the skills directory at ${skillsSrc}: ${err.message}`);
    process.exit(1);
  }
  if (skillDirs.length === 0) {
    console.error(`Error: no skills found under ${skillsSrc}.`);
    process.exit(1);
  }

  warnIfEphemeralSource();
  console.log(`Linking ProMem skills from: ${skillsSrc}\n`);

  let agentsFound = 0;
  for (const { agent, segments } of AGENT_ROOTS) {
    if (!fs.existsSync(path.join(home, segments[0]))) {
      console.log(`${agent}: not detected (${segments[0]} missing) — skipped`);
      continue;
    }
    agentsFound++;
    const skillRoot = path.join(home, ...segments);
    const { created, kept } = linkSkillsIntoRoot(skillRoot, skillsSrc, skillDirs);
    console.log(`${agent}: ${created} linked, ${kept} already present (${skillRoot})`);
  }

  if (agentsFound === 0) {
    console.log('\nNo known agent directories found in your home folder.');
    console.log('Link manually: point your agent\'s skills directory at the folders under ' + skillsSrc);
    return;
  }

  console.log('\nDone. Links point at this ProMem installation — `git pull` here updates every agent instantly.');
  console.log('If you move this clone, run `pm link` again to refresh the links.');
}
