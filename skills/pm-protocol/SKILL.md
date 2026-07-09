---
name: promem-operating-protocol
description: >
  ProMem (Project Memory) framework protocol. Provides a 5-layer holistic
  memory harness for any software project. Run Init to bootstrap ProMem on
  a new or existing project. Follow Operating Rules during every session.
  Use Compaction to manage memory growth.
---

# ProMem Operating Protocol

This skill governs the creation, maintenance, and use of a project's persistent
Second Brain (ProMem). It ensures that any AI agent interacting with the project
can immediately understand its context, rules, and current state.

**This is a router, not a procedure manual.** Each referenced skill owns the
full detail of its own procedure; do not restate their steps here — if a
procedure needs to change, change it once, in the skill that owns it.

---

## 1. INIT — Project Bootstrapping

**Trigger:** The project has no `.pm/` (or `ProMem/`) directory, and the user
requests ProMem initialization.

**Delegate to [`pm-init`](../pm-init/SKILL.md)** for the full reverse-engineering
procedure (deep scan, directory creation, file population, reporting).

The 5-layer structure it builds:

```
.pm/
├── 01_Foundations/    (Brief, Vision)
├── 02_Planning/       (Roadmap, Backlog)
├── 03_Specifications/ (Architecture, API_Contracts, UI_UX_Guidelines)
├── 04_Execution/      (Anatomy, Cerebrum, Memory, ADR, Buglog)
├── 05_Resources/      (Competitors, Inspirations)
└── Archive/           (compacted/archived entries)
```

If additional analysis skills are available (`pm-analyze`, `pm-optimize`,
`complexity-optimizer`), run them after init to enrich the initial brain.

After a structural change (new modules, dependencies, or files), refresh
generated knowledge with `pm update` instead of waiting for the next full
audit — see [`pm-init`](../pm-init/SKILL.md) and `pm.js update`.

---

## 2. OPERATING RULES — Mandatory Agent Behavior

When ProMem is present (`.pm/` or `ProMem/` directory exists), every agent
**must** follow these rules before writing any code. This is the one section
of the protocol that is *not* delegated — it is the contract every other
skill assumes is already being followed.

### 2.1 Read the Vision
Before starting any task, read `01_Foundations/Brief.md` to understand
the project's purpose, scope, and constraints.

### 2.2 Check the Rules
Before making architectural decisions or writing code, consult:
- `04_Execution/Cerebrum.md` — permanent rules, constraints, and learned lessons
- `04_Execution/ADR.md` — past architectural decisions and their rationale

Never contradict an existing Cerebrum rule or ADR without explicit user approval.

### 2.3 Consult the Index
Do not search the codebase blindly. Read `04_Execution/Anatomy.md` first
to locate the target files. This preserves token budget and reduces
hallucination risk.

### 2.4 Log Incremental Transactions
Do not wait until the very end of the session to write your log. For every
completed task, bug fix, or significant file modification, log a transaction —
see [`pm-memory`](../pm-memory/SKILL.md) for the exact command, format, and
writing rules. Do not work in parallel with another agent; ProMem enforces
sequential handoff.

---

## 3. COMPACTION — Manual Memory Cleanup

**Trigger:** User explicitly requests compaction ("compact memory", "clean up
ProMem", "purge old entries", or equivalent).

**Delegate to [`pm-compact`](../pm-compact/SKILL.md)** for the full
Promote → Archive → Clean procedure. Compaction is always manual and always
requires user approval before it runs — never triggered automatically.

---

## 4. SKILL INTEGRATION POINTS

ProMem is designed to work with a modular skill ecosystem. The following
integration points define how external skills interact with ProMem:

| Skill | Reads From | Writes To | Trigger |
|-------|-----------|-----------|---------|
| [`pm-init`](../pm-init/SKILL.md) | Project source tree | All 5 layers | No `.pm/` directory found |
| [`pm-analyze`](../pm-analyze/SKILL.md) | Anatomy + full codebase | `.pm/05_Resources/Analysis/` report, Cerebrum, Buglog | User request for a deep audit |
| [`pm-optimize`](../pm-optimize/SKILL.md) | Source code + Anatomy | Cerebrum, Buglog | User request or post-development, targeted complexity/perf scan |
| [`pm-memory`](../pm-memory/SKILL.md) | Agent session context | Memory.md | Session end or milestone |
| [`pm-compact`](../pm-compact/SKILL.md) | Memory.md | Cerebrum, Archive | User request |
| [`pm-query`](../pm-query/SKILL.md) | All `.pm/` files | Console/report | User question about project |
| [`pm-brainstorm`](../pm-brainstorm/SKILL.md) | Brief, Architecture, Cerebrum | Brief, Backlog, ADR, Architecture | User wants to refine requirements/design |
| [`pm-migrate`](../pm-migrate/SKILL.md) | `.wolf/` directory | Cerebrum, ADR, Buglog, Archive | `.wolf/` found and user requests migration |

See `pm-analyze`'s SKILL.md for the exact boundary against `pm-optimize` —
one is a full audit with a report bundle, the other a narrow, report-free scan.

New skills can be added by following the pattern:
1. Read relevant ProMem files for context
2. Perform analysis or generation
3. Write results back to the appropriate ProMem layer
4. Add one row to this table — do not duplicate another skill's procedure

---

## 5. DIRECTORY NAME CONVENTION & BRAIN RESOLUTION

ProMem accepts either `.pm/` or `ProMem/` as the root directory name.
When checking for ProMem presence, scan for both variants. When creating
a new ProMem directory, follow the user's preference or default to `.pm/`.

**One brain per project.** The `pm` CLI resolves the brain automatically:

1. It walks up from the current directory, so commands work from any
   subdirectory of the project.
2. Resolution stops at the repository boundary (`.git`) — a brain never
   comes from outside the project's own repository.
3. Inside a **git worktree**, the brain of the main checkout is used
   (the brain is typically gitignored and therefore absent from worktrees).
   Agents working in worktrees read and log against the same shared brain.
4. `pm init` refuses to create a second brain when one is already
   resolvable — this prevents split-brain between worktrees or nested
   directories.
