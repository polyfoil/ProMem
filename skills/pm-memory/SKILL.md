---
name: pm-memory
description: >
  Manage the ProMem shift ledger (Memory.md). Write handoff entries when
  ending a session, read the last entry when starting one. Enforces the
  sequential handoff protocol for agent continuity.
---

# pm-memory — Shift Ledger Management

This skill manages the agent handoff log in `.pm/04_Execution/Memory.md`.

---

## On Session Start (Read)

When you begin working on a project with an existing `.pm/` directory:

1. Read `.pm/04_Execution/Memory.md`.
2. Review the **last 5-10 transaction lines** to understand the recent flow of modifications, bug fixes, and system changes.
3. Acknowledge these recent actions in your first response:
   *"Picked up from recent ledger logs. Last action was [X], proceeding with [Y]."*

---

## On Action Completion (Write Incremental Log)

To keep a clean, passive transaction history, **do not wait until the very end of a session to log.** 
Immediately after completing a code change, resolving a bug, or finishing a task:

1. Run the `pm memory` CLI tool from the command line:
   `pm memory "<Detailed description of what you just completed and the file path impacted>" -a <Your_Name>`
2. This will append a formatted transaction line to `.pm/04_Execution/Memory.md`:
   `- [YYYY-MM-DD HH:MM | Agent: <agent_name>]: <description>`

### Writing Rules

- **Be specific and include paths:** Write e.g., `Implemented JWT token rotation in src/auth/jwt.ts` instead of `Updated auth`.
- **Keep it to one line:** The `pm memory` tool automatically structures it as a single markdown list item.
- **Log every milestone:** A typical session should have 2-5 ledger entries documenting the incremental progress.


---

## Rules

1. **Always read before writing.** Don't start coding without checking the
   last Memory entry.
2. **Always write before ending.** Don't leave without a handoff note.
3. **Never delete entries.** Only append. Deletion happens during compaction.
4. **One agent at a time.** If you see a very recent entry (same day, no
   "Next" suggesting handoff), confirm with the user before proceeding.
