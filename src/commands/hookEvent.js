import fs from 'fs';
import path from 'path';
import { findPmRoot } from '../utils/project.js';
import { getRelativePath } from '../utils/fileops.js';
import { readSessionState, mutateSessionState, freshSessionState } from '../utils/session.js';
import { runUpdate } from './update.js';
import {
  HOOK_STDIN_TIMEOUT_MS,
  SESSION_START_MAX_LINES,
  CEREBRUM_NUDGE_EDIT_COUNT
} from '../utils/constants.js';

// Agent-hook layer entry point (see Docs/HOOK-BEHAVIOR-SPEC.md). Every event
// reads the agent's JSON from stdin, acts on the .pm brain, and exits 0 —
// a broken hook must never interrupt the user's actual work.

function readStdin() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    // Safety valve: if the caller never closes stdin, give up rather than
    // hang the agent. The process exits right after, so no unref needed.
    const timer = setTimeout(() => resolve(data), HOOK_STDIN_TIMEOUT_MS);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
  });
}

function parseEventJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

// Last real ledger line of Memory.md ("where the previous shift left off").
function lastTxLine(pmDir) {
  try {
    const content = fs.readFileSync(path.join(pmDir, '04_Execution', 'Memory.md'), 'utf8');
    const entries = content.split('\n').filter(l => /^\s*- \[TX-\d+/.test(l));
    return entries.length > 0 ? entries[entries.length - 1].trim() : null;
  } catch (err) {
    return null;
  }
}

// Newest TX timestamp in Memory.md, as a Date (local time, minute precision).
function lastTxDate(pmDir) {
  const line = lastTxLine(pmDir);
  if (!line) return null;
  const match = line.match(/^- \[TX-\d+ \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  if (!match) return null;
  const parsed = new Date(match[1].replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Section headings plus rule titles from Cerebrum.md — titles only; the
// agent reads the full file when a rule becomes relevant.
function cerebrumTitles(pmDir) {
  try {
    const raw = fs.readFileSync(path.join(pmDir, '04_Execution', 'Cerebrum.md'), 'utf8');
    // Strip HTML comments first: the template documents its format inside
    // <!-- --> blocks, and those example headings are not real rules.
    const content = raw.replace(/<!--[\s\S]*?-->/g, '');
    return content.split('\n')
      .filter(l => /^#{2,3} /.test(l))
      .map(l => (l.startsWith('### ') ? `  - ${l.slice(4).trim()}` : `- ${l.slice(3).trim()}`));
  } catch (err) {
    return [];
  }
}

function handleSessionStart() {
  const found = findPmRoot();
  if (!found) {
    console.log('ProMem: no .pm brain found in this project; run "pm init" to create one.');
    return;
  }
  const { pmDir } = found;
  mutateSessionState(pmDir, () => freshSessionState());

  const lines = ['ProMem session context:'];
  const tx = lastTxLine(pmDir);
  lines.push(tx ? `Last handoff: ${tx}` : 'Last handoff: (Memory.md has no TX entries yet)');
  const titles = cerebrumTitles(pmDir);
  if (titles.length > 0) {
    lines.push('Cerebrum rules (titles only — read the file when one applies):');
    lines.push(...titles);
  }
  lines.push('Full protocol: read Brief.md and Cerebrum.md; locate files via Anatomy.md.');

  if (lines.length > SESSION_START_MAX_LINES) {
    lines.length = SESSION_START_MAX_LINES - 1;
    lines.push('(Cerebrum rule list truncated — read Cerebrum.md for the rest.)');
  }
  console.log(lines.join('\n'));
}

function handleStop() {
  const found = findPmRoot();
  if (!found) return;
  const { pmDir } = found;
  const state = readSessionState(pmDir);
  if (!state) return;

  const started = new Date(state.started);
  if (Number.isNaN(started.getTime())) return;
  // TX timestamps have minute precision; floor the comparison point so a
  // TX logged in the starting minute never triggers a false reminder.
  const startedFloor = new Date(started);
  startedFloor.setSeconds(0, 0);

  if (state.edits.length > 0) {
    const txDate = lastTxDate(pmDir);
    if (!txDate || txDate < startedFloor) {
      console.error(`ProMem: ${state.edits.length} file(s) edited this session but no Memory TX logged. Run: pm memory "<summary>" -a <agent>`);
    }
  }

  if (state.edits.length >= CEREBRUM_NUDGE_EDIT_COUNT) {
    try {
      const cerebrumMtime = fs.statSync(path.join(pmDir, '04_Execution', 'Cerebrum.md')).mtimeMs;
      if (cerebrumMtime < started.getTime()) {
        console.error('ProMem: several files changed — did this session teach a permanent rule or lesson? If so, add it to Cerebrum.md.');
      }
    } catch (err) {
      // No Cerebrum.md — nothing to nudge about.
    }
  }

  if (state.stale) {
    runUpdate({ skipLock: true, edits: state.edits });
    mutateSessionState(pmDir, current => (current ? { ...current, stale: false } : current));
  }
}

// Path containment that survives Windows case-insensitive filesystems.
function isInside(childAbs, parentAbs) {
  let rel = path.relative(parentAbs, childAbs);
  if (process.platform === 'win32') rel = rel.toLowerCase();
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function handlePostWrite(event) {
  const filePath = event && event.tool_input && event.tool_input.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0) return;
  const found = findPmRoot();
  if (!found) return;
  const { projectRoot, pmDir } = found;

  const abs = path.resolve(projectRoot, filePath);
  // Brain edits are not project edits: the brain describes the project,
  // so touching .pm/ must not mark the brain itself as stale.
  if (isInside(abs, pmDir)) return;

  const rel = getRelativePath(abs, projectRoot);
  mutateSessionState(pmDir, current => {
    // A write can arrive before any session-start (hook installed
    // mid-session); start tracking from the first observed edit.
    const state = current || freshSessionState();
    const edits = state.edits.includes(rel) ? state.edits : [...state.edits, rel];
    return { ...state, edits, stale: true };
  });
}

// Anatomy lookup for a file about to be read: Key Files table rows and
// Module Map bullets. Pure retrieval — no counters, no session tracking.
function anatomyDescription(pmDir, rel) {
  let content;
  try {
    content = fs.readFileSync(path.join(pmDir, '04_Execution', 'Anatomy.md'), 'utf8');
  } catch (err) {
    return null;
  }
  for (const line of content.split('\n')) {
    const row = line.match(/^\|\s*`?([^|`]+?)`?\s*\|\s*(.+?)\s*\|\s*$/);
    if (row && row[1].trim() === rel) {
      const desc = row[2].trim();
      if (desc && desc !== 'Purpose' && !desc.startsWith('---') && desc !== '(pending agent annotation)') return desc;
    }
    const bullet = line.match(/^\s*-\s+`([^`]+)`\s*[—–-]\s*(.+)$/);
    if (bullet && (bullet[1] === rel || rel.endsWith(`/${bullet[1]}`))) {
      const desc = bullet[2].trim();
      if (desc) return desc;
    }
  }
  return null;
}

function handlePreRead(event) {
  const filePath = event && event.tool_input && event.tool_input.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0) return;
  const found = findPmRoot();
  if (!found) return;
  const { projectRoot } = found;
  const rel = getRelativePath(path.resolve(projectRoot, filePath), projectRoot);
  const desc = anatomyDescription(found.pmDir, rel);
  if (desc) console.error(`ProMem anatomy: ${rel} — ${desc}`);
}

const HANDLERS = {
  'session-start': handleSessionStart,
  'stop': handleStop,
  'post-write': handlePostWrite,
  'pre-read': handlePreRead
};

export async function runHookEvent(eventName) {
  try {
    const handler = HANDLERS[eventName];
    if (handler) {
      const event = parseEventJson(await readStdin());
      handler(event);
    }
  } catch (err) {
    // Never block, never break: any internal failure degrades to a no-op.
  }
  process.exit(0);
}
