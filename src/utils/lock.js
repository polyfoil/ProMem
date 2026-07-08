import fs from 'fs';
import path from 'path';

export function acquireLock(pmDir) {
  const lockFile = path.join(pmDir, '.pm.lock');
  const maxRetries = 10;
  const retryMs = 500;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      // 'wx' flag opens the file for writing, but fails if it exists
      const fd = fs.openSync(lockFile, 'wx');
      fs.writeSync(fd, `Locked by PID ${process.pid} at ${new Date().toISOString()}\n`);
      fs.closeSync(fd);
      return lockFile;
    } catch (err) {
      if (err.code === 'EEXIST') {
        attempts++;
        if (attempts >= maxRetries) {
          console.error(`Error: Could not acquire lock after ${maxRetries} attempts. Another ProMem instance might be running or left a stale .pm.lock file.`);
          process.exit(1);
        }
        // Sleep sync is okay here since this is a CLI script blocking for a short time
        const start = Date.now();
        while (Date.now() - start < retryMs) {
          // busy wait
        }
      } else {
        throw err;
      }
    }
  }
}

export function releaseLock(lockFile) {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (err) {
    console.error(`Warning: Failed to release lock file ${lockFile}: ${err.message}`);
  }
}
