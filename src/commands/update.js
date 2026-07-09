import fs from 'fs';
import path from 'path';
import { walkProject, replaceSection } from '../utils/fileops.js';
import { buildStackTableLines, buildKeyFilesLines } from '../utils/markdown.js';
import { detectTechStack } from '../utils/detectors.js';

export function runUpdate() {
  const projectRoot = process.cwd();
  const pmDir = path.join(projectRoot, '.pm');

  if (!fs.existsSync(pmDir)) {
    console.error(`Error: .pm directory not found at ${pmDir}. Run "pm init" first.`);
    process.exit(1);
  }

  console.log('Refreshing ProMem generated knowledge...');
  const { fileList: allFiles, tree: projectTree } = walkProject(projectRoot, projectRoot);
  const treeBlockLines = ['```', ...projectTree.split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[i] !== ''), '```'];

  let updated = [];

  const archPath = path.join(pmDir, '03_Specifications', 'Architecture.md');
  if (fs.existsSync(archPath)) {
    const techStack = detectTechStack(projectRoot);
    let content = fs.readFileSync(archPath, 'utf8');
    content = replaceSection(content, '## Tech Stack', buildStackTableLines(techStack));
    content = replaceSection(content, '## Directory Structure', treeBlockLines);
    fs.writeFileSync(archPath, content);
    updated.push('Architecture.md (Tech Stack, Directory Structure)');
  }

  const anatomyPath = path.join(pmDir, '04_Execution', 'Anatomy.md');
  if (fs.existsSync(anatomyPath)) {
    let content = fs.readFileSync(anatomyPath, 'utf8');
    content = replaceSection(content, '## Project Root', treeBlockLines);
    content = replaceSection(content, '## Key Files', buildKeyFilesLines(allFiles, projectRoot));
    fs.writeFileSync(anatomyPath, content);
    updated.push('Anatomy.md (Project Root, Key Files)');
  }

  if (updated.length === 0) {
    console.log('Nothing to update — Architecture.md and Anatomy.md not found under .pm/.');
    return;
  }

  console.log(`Updated: ${updated.join(', ')}`);
  console.log(`Files scanned: ${allFiles.length}`);
  console.log('\nManual sections (Module Map, Key Design Decisions, System Diagram, Data Flow) were left untouched.');
}
