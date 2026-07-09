import fs from 'fs';
import path from 'path';

const PM_DIR_NAMES = ['.pm', 'ProMem'];

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch (err) {
    return false;
  }
}

// A directory only counts as a brain when it actually contains ProMem layer
// structure. Name alone is not enough: a folder that merely happens to be
// called "ProMem" (e.g. a clone of this very repository) must never be
// mistaken for — and mutated as — a project brain.
const BRAIN_MARKER_DIRS = ['04_Execution', '01_Foundations'];

function looksLikeBrain(candidate) {
  return BRAIN_MARKER_DIRS.some(marker => isDirectory(path.join(candidate, marker)));
}

function findPmDirIn(dir) {
  for (const name of PM_DIR_NAMES) {
    const candidate = path.join(dir, name);
    if (isDirectory(candidate) && looksLikeBrain(candidate)) return candidate;
  }
  return null;
}

// Resolves the repository's common .git directory. For a normal checkout this
// is the .git directory itself; for a git worktree (.git is a file pointing
// at <main>/.git/worktrees/<name>) it is the main repository's .git directory.
export function resolveGitCommonDir(projectRoot) {
  const gitEntry = path.join(projectRoot, '.git');
  let stat;
  try {
    stat = fs.statSync(gitEntry);
  } catch (err) {
    return null;
  }
  if (stat.isDirectory()) return gitEntry;
  if (!stat.isFile()) return null;

  let content;
  try {
    content = fs.readFileSync(gitEntry, 'utf8');
  } catch (err) {
    return null;
  }
  const match = content.match(/^gitdir:\s*(.+)\s*$/m);
  if (!match) return null;
  let gitdir = match[1].trim();
  if (!path.isAbsolute(gitdir)) gitdir = path.resolve(projectRoot, gitdir);

  const commonDirFile = path.join(gitdir, 'commondir');
  if (fs.existsSync(commonDirFile)) {
    try {
      const rel = fs.readFileSync(commonDirFile, 'utf8').trim();
      return path.isAbsolute(rel) ? rel : path.resolve(gitdir, rel);
    } catch (err) {
      return null;
    }
  }

  // Fallback: <main>/.git/worktrees/<name> → <main>/.git
  const normalized = gitdir.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/worktrees/');
  if (idx !== -1) return gitdir.slice(0, idx);
  return null;
}

// Walks up from startDir to the nearest directory containing a .git entry.
// Returns null when the path is not inside a git repository.
export function findGitRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Locates the project's memory ("one brain per project"):
// 1. Walk up from startDir, checking for .pm/ (or ProMem/) at each level, so
//    commands work from any subdirectory.
// 2. Stop at the repository boundary (a .git entry) — a project's brain never
//    comes from outside its own repository.
// 3. If the boundary is a git worktree (.git file), fall back to the main
//    checkout's root, where the (typically gitignored) brain actually lives.
export function findPmRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);

  while (true) {
    const pmDir = findPmDirIn(dir);
    if (pmDir) return { projectRoot: dir, pmDir };

    const gitEntry = path.join(dir, '.git');
    let gitStat = null;
    try {
      gitStat = fs.statSync(gitEntry);
    } catch (err) {
      gitStat = null;
    }
    if (gitStat) {
      if (gitStat.isFile()) {
        const commonGitDir = resolveGitCommonDir(dir);
        if (commonGitDir) {
          const mainRoot = path.dirname(commonGitDir);
          const mainPm = findPmDirIn(mainRoot);
          if (mainPm) return { projectRoot: mainRoot, pmDir: mainPm };
        }
      }
      return null;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
