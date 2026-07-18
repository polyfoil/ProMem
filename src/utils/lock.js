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

// A lock is stale when its owning process is gone, or when it is older than
// LOCK_STALE_MS (covers crashed processes whose PID got recycled).
function isLockStale(lockFile) {
  let pid = null;
  try {
    const match = fs.readFileSync(lockFile, 'utf8').match(/PID (\d+)/);
    if (match) pid = Number(match[1]);
  } catch (err) {
    return false; // Lock vanished between checks — just retry normally.
  }

  if (pid !== null && !isProcessAlive(pid)) return true;

  try {
    return Date.now() - fs.statSync(lockFile).mtimeMs > LOCK_STALE_MS;
  } catch (err) {
    return false;
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
    if (isLockStale(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch (unlinkErr) {
        // Another process may have recovered it first.
      }
    }
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
