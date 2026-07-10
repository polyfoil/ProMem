import fs from 'fs';
import path from 'path';
import { tryAcquireLock, releaseLock } from './lock.js';
import { SESSION_FILE_NAME, HOOK_LOCK_RETRIES, HOOK_LOCK_RETRY_MS } from './constants.js';

// Ephemeral per-session state for the agent-hook layer. Lives inside the
// brain directory, is recreated on every session-start, and is safe to
// delete at any time. Corrupt files are replaced, never repaired.

export function sessionFilePath(pmDir) {
  return path.join(pmDir, SESSION_FILE_NAME);
}

export function readSessionState(pmDir) {
  try {
    const state = JSON.parse(fs.readFileSync(sessionFilePath(pmDir), 'utf8'));
    if (!state || typeof state.started !== 'string' || !Array.isArray(state.edits)) return null;
    return state;
  } catch (err) {
    return null;
  }
}

// Read-modify-write under the shared .pm.lock (same discipline as the
// Memory.md ledger). When the lock is held by a live process the mutation
// is silently skipped — hooks never block or fail.
export function mutateSessionState(pmDir, mutate) {
  const lockFile = tryAcquireLock(pmDir, HOOK_LOCK_RETRIES, HOOK_LOCK_RETRY_MS);
  if (!lockFile) return false;
  try {
    const current = readSessionState(pmDir);
    const next = mutate(current);
    if (next) fs.writeFileSync(sessionFilePath(pmDir), JSON.stringify(next, null, 2) + '\n');
    return true;
  } catch (err) {
    return false;
  } finally {
    releaseLock(lockFile);
  }
}

export function freshSessionState() {
  return { started: new Date().toISOString(), edits: [], stale: false };
}
