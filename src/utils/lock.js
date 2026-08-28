import fs from 'fs';
import path from 'path';
import { LOCK_MAX_RETRIES, LOCK_RETRY_MS, LOCK_STALE_MS } from './constants.js';

// Real blocking sleep without spinning the CPU (Node allows Atomics.wait on the main thread).
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to another user.
    return err.code === 'EPERM';
  }
}

// Snapshot identifying one specific lock instance: its contents (owner PID and
// creation time) plus its mtime. If either differs later, the lock changed
// hands and any judgement made about the old one no longer applies.
function lockIdentity(lockFile) {
  try {
    const contents = fs.readFileSync(lockFile, 'utf8');
    return { contents, mtimeMs: fs.statSync(lockFile).mtimeMs };
  } catch (err) {
    return null; // Lock vanished between checks — just retry normally.
  }
}

function sameLock(a, b) {
  return a !== null && b !== null && a.contents === b.contents && a.mtimeMs === b.mtimeMs;
}

// A lock is stale when its owning process is gone, or when it is older than
// LOCK_STALE_MS (covers crashed processes whose PID got recycled).
function isLockStale(identity) {
  const match = identity.contents.match(/PID (\d+)/);
  if (match && !isProcessAlive(Number(match[1]))) return true;
  return Date.now() - identity.mtimeMs > LOCK_STALE_MS;
}

// Remove a lock only if it is still the exact one judged stale. Deciding and
// deleting are separate syscalls, so between them the owner can exit and a
// third process can take the lock — deleting blindly would then destroy a
// live lock and let two writers in. Re-reading immediately before the unlink
// narrows that window to the unlink itself; the filesystem offers nothing
// stronger without advisory locking.
function recoverIfStale(lockFile) {
  const judged = lockIdentity(lockFile);
  if (judged === null || !isLockStale(judged)) return;
  if (!sameLock(lockIdentity(lockFile), judged)) return;

  try {
    fs.unlinkSync(lockFile);
  } catch (unlinkErr) {
    // Another process recovered it first.
  }
}

// Single lock attempt: create the lock file, recovering a stale one first.
// Returns true when the lock was acquired, false when it is held by a live
// process. Throws only on unexpected filesystem errors.
function tryOnce(lockFile) {
  try {
    const fd = fs.openSync(lockFile, 'wx');
    fs.writeSync(fd, `Locked by PID ${process.pid} at ${new Date().toISOString()}\n`);
    fs.closeSync(fd);
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    recoverIfStale(lockFile);
    return false;
  }
}

// Non-fatal variant for hooks: a few quick retries, then null. Hooks must
// degrade to a no-op instead of exiting non-zero or blocking the agent.
export function tryAcquireLock(pmDir, maxRetries, retryMs) {
  const lockFile = path.join(pmDir, '.pm.lock');
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (tryOnce(lockFile)) return lockFile;
    } catch (err) {
      return null;
    }
    if (attempt < maxRetries - 1) sleep(retryMs);
  }
  return null;
}

export function acquireLock(pmDir) {
  const lockFile = path.join(pmDir, '.pm.lock');

  for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    if (tryOnce(lockFile)) return lockFile;

    // tryOnce already recovered a stale lock (if any) by unlinking it; on
    // the next iteration it will succeed. When the lock is held by a live
    // process we wait and retry.
    if (attempt < LOCK_MAX_RETRIES - 1) {
      sleep(LOCK_RETRY_MS);
    }
  }

  console.error(`Error: Could not acquire lock after ${LOCK_MAX_RETRIES} attempts. Another ProMem instance is running (see ${lockFile}).`);
  process.exit(1);
}

export function releaseLock(lockFile) {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (err) {
    console.warn(`Warning: Failed to release lock file ${lockFile}: ${err.message}`);
  }
}
