---
name: pm-migrate
description: >
  Migrate a project from the OpenWolf protocol (.wolf directory) to ProMem
  (.pm). Transfers permanent rules and decisions, converts the legacy buglog,
  archives raw session logs, and moves the entire .wolf directory into
  .pm/Archive/ to retire OpenWolf. Use when a project with a .wolf directory
  should switch to ProMem.
---

# pm-migrate — OpenWolf → ProMem Migration

This skill performs a one-time, one-way migration from an OpenWolf brain
(`.wolf/`) to a ProMem brain (`.pm/`). Each `.wolf` artifact gets a different
treatment based on its value:

| `.wolf` source | Treatment | Destination |
|----------------|-----------|-------------|
| `cerebrum.md` (rules, learnings) | **Migrate** — timeless, high value | `.pm/04_Execution/Cerebrum.md` |
| Architectural decisions (found in cerebrum/memory) | **Migrate** | `.pm/04_Execution/ADR.md` |
| `buglog.json` (error log) | **Convert** — open items only | `.pm/04_Execution/Buglog.md` |
| `anatomy.md` (project map) | **Do NOT migrate** — likely stale; regenerate | `pm-init` rebuilds Anatomy from live code |
| `memory.md` (session logs) | **Do NOT transcribe** — archive raw, grep on demand | `.pm/Archive/wolf/memory.md` |
| The entire `.wolf/` directory | **Move into Archive** — retires OpenWolf | `.pm/Archive/wolf/` |

---

## Prerequisites

1. The project root contains a `.wolf/` directory. If not, this skill does
   not apply — stop and inform the user.
2. A `.pm/` directory must exist. If it does not, run `pm-init` (or
   `node pm.js init`) **first** so Anatomy, Architecture, and Buglog are
   generated fresh from the live codebase, then continue with migration.

---

## Phase 1: Inventory & Plan

1. List everything inside `.wolf/` (standard files: `anatomy.md`,
   `cerebrum.md`, `buglog.json`, `memory.md` — but scan for extras).
2. Read `cerebrum.md`, `buglog.json`, and the **last 10-20 entries** of
   `memory.md`. Do not read the full session log — it is archived raw, not
   transcribed.
3. Present a migration plan to the user before writing anything:

```
OpenWolf migration plan for [project]:
  Rules found in cerebrum.md:      [count] → will be promoted to Cerebrum.md
  Decisions identified:            [count] → will be recorded in ADR.md
  Open issues in buglog.json:      [count] → will be added to Buglog.md
  Session log entries:             [count] → archived raw (not transcribed)
  .wolf/ directory                 → will be MOVED to .pm/Archive/wolf/

Proceed? (y/n)
```

Wait for explicit user approval.

---

## Phase 2: Migrate Knowledge

### 2.1 Rules → Cerebrum.md

For each rule or learning in `.wolf/cerebrum.md`, append to
`.pm/04_Execution/Cerebrum.md` in the standard structured format:

```markdown
### Rule: [Title]
- **Source:** OpenWolf migration ([date])
- **Rule:** [the permanent constraint or lesson]
- **Rationale:** [why this matters — carry over if recorded, otherwise infer or mark "not recorded"]
```

**Deduplicate:** skip rules that already exist in Cerebrum.md (match by
meaning, not exact wording).

### 2.2 Decisions → ADR.md

If cerebrum or recent memory entries contain architectural decisions
("we chose X over Y because…"), record each in `.pm/04_Execution/ADR.md`
with its original date if known.

### 2.3 buglog.json → Buglog.md

Convert entries to the Open Issues table with `WOLF-` prefixed IDs:

```markdown
| ID | Severity | Description | File(s) | Status |
|----|----------|-------------|---------|--------|
| WOLF-001 | High | [from buglog.json] | [path if recorded] | Open |
```

- Only migrate **unresolved** items to Open Issues.
- Items marked resolved go to the Resolved Issues section (one line each).
- Skip entries that duplicate issues already found by `pm-init`'s scan.

### 2.4 Bridge Entry → Memory.md

If the last `.wolf/memory.md` entries describe **in-progress work**, write a
single bridging transaction to `.pm/04_Execution/Memory.md` via the CLI:

`pm memory "Migrated from OpenWolf. Last known state: <one-line summary of in-progress work>. Legacy logs: .pm/Archive/wolf/memory.md" -a <Your_Name>`

Do not transcribe historical entries — one bridge line is the maximum.

---

## Phase 3: Archive & Retire .wolf

**This step is mandatory — a migrated project must not keep `.wolf/` at the
project root.** The OpenWolf protocol triggers on the presence of a `.wolf`
directory; leaving it in place causes dual-write split-brain between the two
memory systems.

1. Move the **entire** `.wolf/` directory into the ProMem archive:
   - PowerShell: `Move-Item .wolf .pm/Archive/wolf`
   - bash: `mv .wolf .pm/Archive/wolf`
2. If `.pm/Archive/wolf/` already exists (re-run), move to a dated variant
   instead: `.pm/Archive/wolf_YYYY-MM-DD/`.
3. Verify the project root no longer contains `.wolf/`.

The legacy logs remain fully greppable under `.pm/Archive/wolf/` — nothing
is deleted, only relocated.

---

## Phase 4: Entrypoints & Log

1. Ensure `CLAUDE.md` and `.cursorrules` exist at the project root and point
   to the ProMem protocol (`pm-init` generates them; create manually if
   missing).
2. Remove any OpenWolf references from project rule files (`CLAUDE.md`,
   `.cursorrules`, README) so no agent re-initializes `.wolf`.
3. Log the migration:

`pm memory "Migrated project from OpenWolf to ProMem: <N> rules promoted, <M> issues transferred, .wolf archived to .pm/Archive/wolf/." -a <Your_Name>`

---

## Phase 5: Report

```
OpenWolf → ProMem migration complete.

Promoted to Cerebrum:  [count] rules
Recorded in ADR:       [count] decisions
Transferred to Buglog: [count] issues (WOLF-xxx)
Bridge entry:          [written / not needed]
Legacy archive:        .pm/Archive/wolf/ ([file count] files, greppable)
.wolf at project root: removed ✔

OpenWolf is retired for this project. All agents now operate on .pm/ only.
```

---

## Rules

1. **Never delete `.wolf` content.** Move, don't remove. The archive must
   contain everything the original directory had.
2. **Always ask before executing.** Show the Phase 1 plan and get approval.
3. **Never migrate anatomy.** Stale maps are worse than no map — `pm-init`
   regenerates Anatomy from the live codebase.
4. **Never transcribe legacy session logs.** Archive raw; agents grep
   `.pm/Archive/wolf/` on demand.
5. **One protocol per project.** After migration, OpenWolf must never run
   here again — Phase 3 is not optional.
6. **One-way migration.** ProMem → OpenWolf is not supported.
