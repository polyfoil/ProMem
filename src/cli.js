import fs from 'fs';
import { fileURLToPath } from 'url';
import { runInit } from './commands/init.js';
import { runUpdate } from './commands/update.js';
import { runMemory } from './commands/memory.js';
import { runCompact } from './commands/compact.js';
import { runStatus } from './commands/status.js';
import { runHook } from './commands/hook.js';
import { runHookEvent } from './commands/hookEvent.js';
import { runLink } from './commands/link.js';

// Single-pass extraction of the -a/--agent flag from memory arguments.
// Only the last occurrence is consumed; all other args form the message.
// The previous implementation had a second filter() pass that silently
// removed literal "-a" / "--agent" words from the message text (SRN-2).
function parseMemoryArgs(rawArgs) {
  const args = [...rawArgs];
  let agent = 'Developer';
  const agentIdx = Math.max(args.lastIndexOf('--agent'), args.lastIndexOf('-a'));

  if (agentIdx !== -1) {
    if (agentIdx === args.length - 1) {
      console.error(`Error: ${args[agentIdx]} requires a value (the agent name).`);
      process.exit(1);
    }
    agent = args[agentIdx + 1];
    args.splice(agentIdx, 2);
  }

  const msg = args.join(' ') || 'Manual update';
  return { msg, agent };
}

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
  hook claude    Install the ProMem agent hooks into .claude/settings.json
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
        const { msg, agent } = parseMemoryArgs(args.slice(1));
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
        runHook(args[1]);
        break;
      case 'hook-event':
        // Agent-hook events manage their own failure policy (always exit 0)
        // and read the event JSON from stdin asynchronously.
        runHookEvent(args[1]);
        return;
      case 'link':
        runLink();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: File or directory not found (${err.path || err.message}). Please ensure you are running this in a valid project directory.`);
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error(`Error: Permission denied accessing ${err.path || 'a file'}. Please check your folder permissions or run as administrator.`);
    } else if (err.code === 'EISDIR') {
      console.error(`Error: Expected a file but found a directory at ${err.path || err.message}.`);
    } else {
      // Commands handle their own expected failures; anything reaching here is
      // unexpected — show a concise message instead of a raw stack trace.
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}
