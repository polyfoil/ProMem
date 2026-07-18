import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import { tryAcquireLock, releaseLock } from '../src/utils/lock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'temp-lock-race');

if (process.env.CHILD_LOCK_TEST) {
  // Worker behavior
  try {
    const lockFile = tryAcquireLock(tempDir, 1, 0); // Only try once
    if (lockFile) {
      process.send('LOCKED');
      // Hold the lock and stay alive until the parent explicitly tells us to exit.
      // This prevents the lock from being released or becoming stale while other
      // slower CI workers are still booting up.
      process.on('message', (msg) => {
        if (msg === 'EXIT') {
          releaseLock(lockFile);
          process.exit(0);
        }
      });
    } else {
      process.send('DENIED');
      process.on('message', (msg) => {
        if (msg === 'EXIT') process.exit(0);
      });
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
} else {
  // Main test behavior
  test('Multi-process lock race condition (MD-1)', async () => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    const workersCount = 10;
    const promises = [];
    const children = [];

    // Spawn multiple workers at the exact same time to create a race condition
    for (let i = 0; i < workersCount; i++) {
      promises.push(new Promise((resolve, reject) => {
        const child = fork(__filename, [], { env: { ...process.env, CHILD_LOCK_TEST: '1' } });
        children.push(child);
        
        child.on('message', msg => {
          resolve(msg);
        });
        
        child.on('error', err => reject(err));
        // If it exits before sending a message, something crashed
        child.on('exit', code => {
          if (code !== 0) reject(new Error(`Worker exited early with code ${code}`));
        });
      }));
    }

    // Wait for all workers to report their acquisition status
    const results = await Promise.all(promises);
    
    // Now that everyone has reported, tell them all to exit safely
    for (const child of children) {
      child.send('EXIT');
    }

    const lockedCount = results.filter(r => r === 'LOCKED').length;
    const deniedCount = results.filter(r => r === 'DENIED').length;

    // Exactly one worker must acquire the lock. The O_EXCL flag ensures atomicity
    // at the OS level, so the others must be denied.
    assert.strictEqual(lockedCount, 1, 'Exactly one process should acquire the lock concurrently');
    assert.strictEqual(deniedCount, workersCount - 1, 'All other processes should be denied');

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
}
