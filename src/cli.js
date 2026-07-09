import fs from 'fs';
import { fileURLToPath } from 'url';
import { runInit } from './commands/init.js';
import { runUpdate } from './commands/update.js';
import { runMemory } from './commands/memory.js';
import { runCompact } from './commands/compact.js';
import { runStatus } from './commands/status.js';
import { runHook } from './commands/hook.js';
import { runLink } from './commands/link.js';

export function runCli(args) {
  const command = args[0];

  if (!command) {
    console.log(`
ProMem CLI Utility

Commands:
  init           Initialize .pm directory structure and index files
  update         Refresh generated Anatomy/Architecture sections (requires existing .pm/)
  memory [msg]   Log a new handoff entry to Memory.md
  compact        Archive completed entries and compress Memory.md
  status         Run health checks on .pm directory and auto-fix issues
  hook           Install a git post-commit hook for automatic updates
  link           Link the ProMem skills into every AI agent installed on this machine
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'init':
        runInit();
        break;
      case 'update':
        runUpdate();
        break;
      case 'memory': {
        let agent = 'Developer';
        let msgArgs = [];
        for (let i = 1; i < args.length; i++) {
          if ((args[i] === '--agent' || args[i] === '-a') && args[i + 1]) {
            agent = args[i + 1];
            i++;
          } else {
            msgArgs.push(args[i]);
          }
        }
        const msg = msgArgs.join(' ') || 'Manual update';
        runMemory(msg, agent);
        break;
      }
      case 'compact':
        runCompact();
        break;
      case 'status':
        runStatus();
        break;
      case 'hook':
        runHook();
        break;
      case 'link':
        runLink();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (err) {
    // Commands handle their own expected failures; anything reaching here is
    // unexpected — show a concise message instead of a raw stack trace.
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
