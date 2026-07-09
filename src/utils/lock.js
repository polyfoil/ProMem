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

export function acquireLock(pmDir) {
  const lockFile = path.join(pmDir, '.pm.lock');
  let attempts = 0;

  while (attempts < LOCK_MAX_RETRIES) {
    try {
      // 'wx' flag opens the file for writing, but fails if it exists
      const fd = fs.openSync(lockFile, 'wx');
      fs.writeSync(fd, `Locked by PID ${process.pid} at ${new Date().toISOString()}\n`);
      fs.closeSync(fd);
      return lockFile;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      if (isLockStale(lockFile)) {
        console.warn('Warning: recovered a stale .pm.lock left by a dead process.');
        try {
          fs.unlinkSync(lockFile);
        } catch (unlinkErr) {
          // Another process may have recovered it first — fall through and retry.
        }
        attempts++;
        continue;
      }

      attempts++;
      if (attempts >= LOCK_MAX_RETRIES) {
        console.error(`Error: Could not acquire lock after ${LOCK_MAX_RETRIES} attempts. Another ProMem instance is running (see ${lockFile}).`);
        process.exit(1);
      }
      sleep(LOCK_RETRY_MS);
    }
  }
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
