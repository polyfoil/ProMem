import fs from 'fs';
import path from 'path';
import { loadTemplate, walkProject, getRelativePath, replaceSection } from '../utils/fileops.js';
import { detectTechStack } from '../utils/detectors.js';
import { scanForTodos } from '../utils/scanner.js';
import { ANATOMY_KEY_FILE_NAMES, ANATOMY_KEY_FILE_LIMIT } from '../utils/constants.js';

function buildStackTableLines(techStack) {
  const lines = ['| Layer | Technology | Version | Purpose |', '|-------|-----------|---------|---------|'];
  for (const item of techStack) {
    lines.push(`| ${item.layer} | ${item.technology} | ${item.version} | ${item.purpose} |`);
  }
  return lines;
}

function buildKeyFilesLines(allFiles, projectRoot) {
  const lines = ['| File | Purpose |', '|------|---------|'];
  const importantFiles = allFiles.filter(f => {
    const name = path.basename(f);
    const relPath = getRelativePath(f, projectRoot);
    return ANATOMY_KEY_FILE_NAMES.has(name) || relPath.includes('src/');
  }).slice(0, ANATOMY_KEY_FILE_LIMIT);

  for (const file of importantFiles) {
    lines.push(`| ${getRelativePath(file, projectRoot)} | (pending agent annotation) |`);
  }
  return lines;
}

function buildBuglogTableLines(issues) {
  const lines = ['| ID | Severity | Description | File(s) | Status |', '|----|----------|-------------|---------|--------|'];
  for (const issue of issues) {
    lines.push(`| ${issue.id} | ${issue.severity} | ${issue.description} | ${issue.file} | ${issue.status} |`);
  }
  return lines;
}

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
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  const memoryHeader = loadTemplate('04_Execution/Memory.md', `# Memory — Shift Ledger\n`);
  const initEntry = `\n- [${today} ${time} | Agent: pm-cli]: ProMem project memory initialized successfully.\n`;
  fs.writeFileSync(path.join(pmDir, '04_Execution', 'Memory.md'), memoryHeader.trimEnd() + '\n' + initEntry);
}

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
      const existingContent = fs.readFileSync(filePath, 'utf8');
      if (!existingContent.includes('.pm/04_Execution/Memory.md')) {
        // Prepend to top of the file
        fs.writeFileSync(filePath, rule.content + existingContent);
        console.log('Prepended ProMem rules to existing ' + rule.file);
      }
    } else {
      // Only create if we are targeting the standard ones or they ask for it?
      // Actually, we should probably not create AGENTS.md if it doesn't exist to avoid clutter.
      if (rule.file !== 'AGENTS.md') {
        fs.writeFileSync(filePath, rule.content);
        console.log('Generated ' + rule.file + ' in project root');
      }
    }
  }
}

export function runInit() {
  const projectRoot = process.cwd();
  const pmDir = path.join(projectRoot, '.pm');

  if (fs.existsSync(pmDir)) {
    console.error(`Error: .pm directory already exists at ${pmDir}. Aborting.`);
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
