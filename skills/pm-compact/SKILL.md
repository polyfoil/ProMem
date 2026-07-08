---
name: pm-compact
description: >
  Manual compaction of ProMem memory. Promotes permanent rules from Memory.md
  to Cerebrum.md, archives completed work, and cleans the shift ledger.
  Use when Memory.md is bloated or the user requests cleanup.
---

# pm-compact — Memory Compaction

This skill performs manual cleanup of the ProMem shift ledger when triggered
by the user.

---

## Trigger

User says one of:
- "compact memory" / "compact promem"
- "clean up memory" / "clean up promem"
- "purge old entries"
- "promem compact"
- Or any equivalent request

---

## Step 1: Analyze

Read `.pm/04_Execution/Memory.md` in its entirety. Categorize each entry:

| Category | Criteria | Action |
|----------|----------|--------|
| **Promotable** | Contains a permanent lesson, rule, or constraint | Move to Cerebrum.md |
| **Archivable** | Work is fully completed, no active relevance | Summarize → Archive |
| **Active** | Work is in progress or has unresolved blockers | Keep in Memory.md |

Present the categorization to the user for review before proceeding.

---

## Step 2: Promote

For each promotable entry, create a structured rule in
`.pm/04_Execution/Cerebrum.md`:

```markdown
## [Rule Title]
- **Source:** Memory entry from [date]
- **Rule:** [the permanent constraint or lesson]
- **Rationale:** [why this matters]
```

Examples of promotable content:
- "Library X causes memory leaks, use Library Y instead"
- "Always run migrations before seeding"
- "The client requires all dates in UTC"
- "Never modify the legacy API endpoints — they have external consumers"

---

## Step 3: Archive and Summarize (The Story So Far)

If the compaction was triggered by the CLI tool `pm compact`, there will be an `Archive/YYYY-MM-DD_Memory_Pending.md` file. Read this file. If not, read the current `.pm/04_Execution/Memory.md`.

Read the entire history of the project in this ledger. Generate a cohesive 1-2 paragraph summary that captures the entire historical context, major milestones, and current architectural state of the project.

Write this summary to the very top of `.pm/04_Execution/Memory.md` under a header called `## The Story So Far`.

Format for the new `Memory.md`:
```markdown
# Memory — Shift Ledger

## The Story So Far
[Your 1-2 paragraph comprehensive project history summary]

## Recent Entries
- [Keep only the last 10 active transaction entries here]
```

---

## Step 4: Finalize Archive

If you read from `Archive/YYYY-MM-DD_Memory_Pending.md`, rename it to `Archive/YYYY-MM-DD_Memory.md` (remove the `_Pending` suffix) to finalize the archive.

If you read directly from `.pm/04_Execution/Memory.md`, move all older entries (everything except the last 10) into a dated archive file in the `Archive/` directory.

---

## Step 5: Report

```
Compaction complete.

Promoted to Cerebrum: [count] rules
The Story So Far summary has been updated.
Memory.md has been reset with the rolling summary.
Archived old entries successfully.
```

---

## Rules

1. **Always ask before executing.** Show the categorization (Step 1) and
   get user approval before promoting, archiving, or deleting anything.
2. **Never auto-compact.** This skill runs only on explicit user request.
3. **Preserve active work.** If in doubt about whether an entry is still
   relevant, keep it.
4. **Don't merge rules.** Each Cerebrum entry should be atomic and
   independently understandable.
