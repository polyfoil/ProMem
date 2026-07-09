import fs from 'fs';
import path from 'path';
import { ROOT_DIR } from '../utils/constants.js';

export function runHook() {
  const projectRoot = process.cwd();
  const gitDir = path.join(projectRoot, '.git');
  const hooksDir = path.join(gitDir, 'hooks');
  const postCommitPath = path.join(hooksDir, 'post-commit');

  if (!fs.existsSync(gitDir)) {
    console.error('Error: Not a git repository (no .git folder found). Please run "git init" first.');
    process.exit(1);
  }

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Git hooks run under sh even on Windows, so the embedded absolute path
  // must use forward slashes. Embedding the path makes the hook work even
  // when 'pm' is not on the PATH (GUI git clients, cron, etc.).
  const pmJsPath = path.join(ROOT_DIR, 'pm.js').replace(/\\/g, '/');

  const hookScript = `#!/bin/sh
# ProMem Auto-Update Hook
if command -v pm >/dev/null 2>&1; then
  pm update
elif [ -f "${pmJsPath}" ]; then
  node "${pmJsPath}" update
else
  echo "ProMem: 'pm' not on PATH and ${pmJsPath} not found; skipping auto-update."
  exit 0
fi

echo ""
echo "Reminder: Did you log your work to Memory.md? (Run: pm memory '<message>')"
`;

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
