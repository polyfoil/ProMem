import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROOT_DIR is two levels up from src/utils (src/utils -> src -> ProMem)
export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');

export const IGNORE_DIRS = new Set([
  // VCS / tool state
  '.git', '.pm', '.claude', '.wolf', '.idea', '.vscode',
  // Package/dependency dirs
  'node_modules', 'vendor',
  // Build outputs
  'dist', 'build', 'out', 'target', 'bin', 'obj',
  // Framework caches
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache',
  // Python
  '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.tox',
  // Test artifacts
  'coverage'
]);

export const MAX_SCAN_DEPTH = 5;
export const MEMORY_WARNING_THRESHOLD = 300;
export const ANATOMY_KEY_FILE_LIMIT = 20;
export const ANATOMY_KEY_FILE_NAMES = new Set([
  'package.json', 'pyproject.toml', 'requirements.txt', 'README.md', 'main.py', 'index.js', 'app.py', 'pm.js'
]);

// Files above this size are almost certainly generated (bundles, vendored
// blobs) — scanning them wastes memory for no signal.
export const TODO_SCAN_MAX_BYTES = 1024 * 1024;

export const TODO_SCAN_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.kt', '.cs',
  '.rb', '.php', '.sh', '.c', '.cpp', '.h', '.hpp', '.swift'
]);
export const COMMENT_MARKERS = ['//', '#', '/*', '*', '<!--', '--'];

export const LOCK_MAX_RETRIES = 10;
export const LOCK_RETRY_MS = 500;
export const LOCK_STALE_MS = 10 * 60 * 1000;

// Agent-hook layer (pm hook-event). Hooks must never block the agent, so
// they use few, fast lock retries and give up as a silent no-op.
export const SESSION_FILE_NAME = '.session.json';
export const HOOK_LOCK_RETRIES = 3;
export const HOOK_LOCK_RETRY_MS = 100;
export const HOOK_STDIN_TIMEOUT_MS = 2000;
export const SESSION_START_MAX_LINES = 40;
export const CEREBRUM_NUDGE_EDIT_COUNT = 3;

export const PROMEM_DIRECTORIES = ['01_Foundations', '02_Planning', '03_Specifications', '04_Execution', '05_Resources', 'Archive'];

export const FALLBACK_TEMPLATES = [
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

export const ENTRYPOINT_FALLBACK = '# ProMem\n\n- Read `.pm/01_Foundations/Brief.md` and `.pm/04_Execution/Cerebrum.md` before any task.\n- Locate files via `.pm/04_Execution/Anatomy.md`; log handoffs to `.pm/04_Execution/Memory.md`.\n';
