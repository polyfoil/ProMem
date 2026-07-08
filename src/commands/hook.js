import fs from 'fs';
import path from 'path';

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

  const hookScript = `#!/bin/sh
# ProMem Auto-Update Hook
echo "Running ProMem auto-update..."
if command -v pm >/dev/null 2>&1; then
  pm update
else
  node pm.js update
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
