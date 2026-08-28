import fs from 'fs';
import path from 'path';
import { ROOT_DIR } from '../utils/constants.js';
import { loadTemplate } from '../utils/fileops.js';
import { resolveGitCommonDir } from '../utils/project.js';
import { runHookClaude } from './hookClaude.js';

// Minimal stand-in for a broken installation; templates/hooks/post-commit is
// the source of truth.
const HOOK_SCRIPT_FALLBACK = `#!/bin/sh
if command -v pm >/dev/null 2>&1; then
  pm update
elif [ -f "{{PM_JS_PATH}}" ]; then
  node "{{PM_JS_PATH}}" update
fi
`;

export function runHook(target) {
  // "pm hook claude" installs the agent-hook layer for Claude Code;
  // bare "pm hook" keeps its original git post-commit behavior.
  if (target === 'claude') {
    runHookClaude();
    return;
  }
  if (target) {
    console.error(`Unknown hook target: ${target}. Supported: claude (or no argument for the git post-commit hook).`);
    process.exit(1);
  }
  const projectRoot = process.cwd();

  if (!fs.existsSync(path.join(projectRoot, '.git'))) {
    console.error('Error: Not a git repository (no .git folder found). Please run "git init" first.');
    process.exit(1);
  }

  // Worktree-aware: hooks live in the repository's common .git directory,
  // shared by the main checkout and all of its worktrees.
  const gitDir = resolveGitCommonDir(projectRoot);
  if (!gitDir) {
    console.error('Error: could not resolve the git directory for this checkout.');
    process.exit(1);
  }
  const hooksDir = path.join(gitDir, 'hooks');
  const postCommitPath = path.join(hooksDir, 'post-commit');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Git hooks run under sh even on Windows, so the embedded absolute path
  // must use forward slashes. Embedding the path makes the hook work even
  // when 'pm' is not on the PATH (GUI git clients, cron, etc.).
  const pmJsPath = path.join(ROOT_DIR, 'pm.js').replace(/\\/g, '/');

  // Script body lives in templates/ like every other generated static file.
  const hookScript = loadTemplate('hooks/post-commit', HOOK_SCRIPT_FALLBACK)
    .replace(/\{\{PM_JS_PATH\}\}/g, pmJsPath);

  if (fs.existsSync(postCommitPath)) {
    const content = fs.readFileSync(postCommitPath, 'utf8');
    if (content.includes('pm update') || content.includes('ProMem')) {
      console.log('ProMem git hook is already installed in .git/hooks/post-commit');
      return;
    }
    // Append to existing hook
    fs.appendFileSync(postCommitPath, '\n' + hookScript);
    console.log('Appended ProMem git hook to existing .git/hooks/post-commit');
  } else {
    // Create new hook
    fs.writeFileSync(postCommitPath, hookScript);
    try {
      fs.chmodSync(postCommitPath, '755');
    } catch (e) {
      // Ignored on windows
    }
    console.log('Created ProMem git hook at .git/hooks/post-commit');
  }

  console.log('Success! Every time you commit, ProMem will automatically update the Architecture and Anatomy files.');
}
