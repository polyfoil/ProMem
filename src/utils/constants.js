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
