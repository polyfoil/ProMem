import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROOT_DIR is two levels up from src/utils (src/utils -> src -> ProMem)
export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');

export const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.pm', 'dist', 'build', '.venv', '__pycache__', '.pytest_cache', '.claude', '.wolf'
]);

export const MAX_SCAN_DEPTH = 5;
export const MEMORY_WARNING_THRESHOLD = 5000;
export const ANATOMY_KEY_FILE_LIMIT = 20;
export const ANATOMY_KEY_FILE_NAMES = new Set([
  'package.json', 'pyproject.toml', 'requirements.txt', 'README.md', 'main.py', 'index.js', 'app.py', 'pm.js'
]);

export const TODO_SCAN_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.kt', '.cs',
  '.rb', '.php', '.sh', '.c', '.cpp', '.h', '.hpp', '.swift'
]);
export const COMMENT_MARKERS = ['//', '#', '/*', '*', '<!--', '--'];
