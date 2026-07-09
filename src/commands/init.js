import fs from 'fs';
import path from 'path';
import { loadTemplate, walkProject, replaceSection } from '../utils/fileops.js';
import { buildStackTableLines, buildKeyFilesLines, buildBuglogTableLines } from '../utils/markdown.js';
import { detectTechStack } from '../utils/detectors.js';
import { scanForTodos } from '../utils/scanner.js';
import { formatMemoryEntry } from '../utils/ledger.js';
import { findPmRoot, findGitRoot } from '../utils/project.js';

function writeStaticFiles(pmDir) {
  const staticFiles = [
    ['01_Foundations/Brief.md', `# Project Brief\n\n## Overview\n\n## Problem Statement\n\n## Target Audience\n\n## Scope\n\n### In Scope\n-\n\n### Out of Scope\n-\n`],
    ['01_Foundations/Vision.md', `# Product Vision\n\n## Long-Term Vision\n\n## Core Values\n`],
    ['02_Planning/Roadmap.md', `# Roadmap\n\n## Current Phase\n\n## Milestones\n`],
    ['02_Planning/Backlog.md', `# Backlog\n\n## Priority Legend\n- 🔴 P0\n- 🟠 P1\n- 🟡 P2\n- 🟢 P3\n`],
    ['03_Specifications/API_Contracts.md', `# API Contracts\n`],
    ['03_Specifications/UI_UX_Guidelines.md', `# UI/UX Guidelines\n`],
    ['04_Execution/Cerebrum.md', `# Cerebrum — Permanent Rules & Learnings\n`],
    ['04_Execution/ADR.md', `# Architectural Decision Records\n`],
    ['05_Resources/Competitors.md', `# Competitors\n`],
    ['05_Resources/Inspirations.md', `# Inspirations\n`]
  ];
  for (const [relPath, fallback] of staticFiles) {
    fs.writeFileSync(path.join(pmDir, ...relPath.split('/')), loadTemplate(relPath, fallback));
  }
}

function writeArchitecture(pmDir, techStack, projectTree) {
  let archContent = loadTemplate('03_Specifications/Architecture.md', '# System Architecture\n\n## Tech Stack\n\n## Directory Structure\n');
  const treeBlockLines = ['```', ...projectTree.split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[i] !== ''), '```'];
  archContent = replaceSection(archContent, '## Tech Stack', buildStackTableLines(techStack));
  archContent = replaceSection(archContent, '## Directory Structure', treeBlockLines);
  fs.writeFileSync(path.join(pmDir, '03_Specifications', 'Architecture.md'), archContent);
}

function writeAnatomy(pmDir, allFiles, projectRoot, projectTree) {
  let anatomyContent = loadTemplate('04_Execution/Anatomy.md', '# Project Anatomy (Index)\n\n## Project Root\n\n## Key Files\n');
  const treeBlockLines = ['```', ...projectTree.split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[i] !== ''), '```'];
  anatomyContent = replaceSection(anatomyContent, '## Project Root', treeBlockLines);
  anatomyContent = replaceSection(anatomyContent, '## Key Files', buildKeyFilesLines(allFiles, projectRoot));
  fs.writeFileSync(path.join(pmDir, '04_Execution', 'Anatomy.md'), anatomyContent);
}

function writeBuglog(pmDir, issues) {
  let buglogContent = loadTemplate('04_Execution/Buglog.md', '# Bug Log\n\n## Open Issues\n');
  buglogContent = replaceSection(buglogContent, '## Open Issues', buildBuglogTableLines(issues));
  fs.writeFileSync(path.join(pmDir, '04_Execution', 'Buglog.md'), buglogContent);
}

function writeMemoryInit(pmDir) {
  const memoryHeader = loadTemplate('04_Execution/Memory.md', `# Memory — Shift Ledger\n`);
  const initEntry = formatMemoryEntry(1, 'pm-cli', 'ProMem project memory initialized successfully.');
  fs.writeFileSync(path.join(pmDir, '04_Execution', 'Memory.md'), memoryHeader.trimEnd() + '\n\n' + initEntry);
}

// The CLI never modifies existing user-maintained rule files. Merging ProMem
// rules into an existing CLAUDE.md/.cursorrules is a consent-based agent task
// (see the pm-init skill).
function writeEntrypoints(projectRoot) {
  const rules = [
    {
      file: '.cursorrules',
      content: `# ProMem Project Memory Configuration\n\n# Mandatory Operating Rules:\n- Before starting any task, read \`.pm/01_Foundations/Brief.md\` and \`.pm/04_Execution/Cerebrum.md\` to understand context and constraints.\n- Always consult \`.pm/04_Execution/Anatomy.md\` index before searching the codebase to save token budget.\n- When finishing a task or ending a session, record a handoff entry in \`.pm/04_Execution/Memory.md\`.\n\n`
    },
    {
      file: 'CLAUDE.md',
      content: `# ProMem Guidelines\n\n## Guidelines\n- Before starting any task, read \`.pm/01_Foundations/Brief.md\` and \`.pm/04_Execution/Cerebrum.md\`.\n- Use \`.pm/04_Execution/Anatomy.md\` to locate files instead of broad scans.\n- Log a handoff entry to \`.pm/04_Execution/Memory.md\` at the end of every session.\n\n`
    },
    {
      file: 'AGENTS.md',
      content: `# ProMem Agent Instructions\n\n- Before starting any task, read \`.pm/01_Foundations/Brief.md\` and \`.pm/04_Execution/Cerebrum.md\`.\n- Use \`.pm/04_Execution/Anatomy.md\` to locate files instead of broad scans.\n- Log a handoff entry to \`.pm/04_Execution/Memory.md\` at the end of every session.\n\n`
    }
  ];

  for (const rule of rules) {
    const filePath = path.join(projectRoot, rule.file);
    if (fs.existsSync(filePath)) {
      console.log(`Found existing ${rule.file} — left untouched. Ask your AI agent to merge the ProMem operating rules into it (pm-init skill).`);
    } else if (rule.file !== 'AGENTS.md') {
      // AGENTS.md is only relevant when the user already maintains one.
      fs.writeFileSync(filePath, rule.content);
      console.log(`Generated ${rule.file} in project root`);
    }
  }
}

export function runInit() {
  const projectRoot = process.cwd();
  const pmDir = path.join(projectRoot, '.pm');

  // Never re-initialize over an existing .pm/ProMem directory at cwd, even a
  // broken one that no longer passes brain-marker detection.
  for (const name of ['.pm', 'ProMem']) {
    const candidate = path.join(projectRoot, name);
    if (fs.existsSync(candidate)) {
      console.error(`Error: ${name} directory already exists at ${candidate}. Aborting.`);
      process.exit(1);
    }
  }

  // One brain per project: also refuse when the brain lives in a parent
  // directory or in the main checkout of a git worktree (split-brain guard).
  const existing = findPmRoot(projectRoot);
  if (existing) {
    console.error(`Error: this project already has a memory at ${existing.pmDir}`);
    console.error('(resolved from a parent directory or the main worktree checkout — ProMem keeps one brain per project).');
    console.error('All ProMem commands resolve to that brain automatically; no init is needed here.');
    process.exit(1);
  }

  // The brain belongs at the project root. Refuse to plant one in a
  // subdirectory of a git repository — resolution only walks upward, so a
  // brain below the root would be invisible to sessions starting at the root.
  const gitRoot = findGitRoot(projectRoot);
  if (gitRoot && gitRoot !== projectRoot) {
    console.error(`Error: you are in a subdirectory of a git repository (root: ${gitRoot}).`);
    console.error('Run "pm init" from the repository root — ProMem keeps one brain per project, at the top.');
    process.exit(1);
  }

  console.log('Initializing ProMem project memory harness...');

  const dirs = ['01_Foundations', '02_Planning', '03_Specifications', '04_Execution', '05_Resources', 'Archive'];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(pmDir, dir), { recursive: true });
  }

  console.log('Scanning project files...');
  const { fileList: allFiles, tree: projectTree } = walkProject(projectRoot, projectRoot);

  console.log('Generating Foundations...');
  writeStaticFiles(pmDir);

  console.log('Analyzing project architecture...');
  const techStack = detectTechStack(projectRoot);
  writeArchitecture(pmDir, techStack, projectTree);

  console.log('Generating Anatomy map...');
  writeAnatomy(pmDir, allFiles, projectRoot, projectTree);

  console.log('Scanning for TODOs/FIXMEs...');
  const issues = scanForTodos(allFiles, projectRoot);
  writeBuglog(pmDir, issues);

  writeMemoryInit(pmDir);
  fs.writeFileSync(path.join(pmDir, 'Archive', '.gitkeep'), '');
  writeEntrypoints(projectRoot);

  console.log(`\nProMem initialized successfully in ${pmDir}`);
  console.log(`Files mapped: ${allFiles.length}`);
  console.log(`TODOs / Issues logged: ${issues.length}`);
}
