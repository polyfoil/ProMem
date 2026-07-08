---
name: pm-query
description: >
  Query the ProMem brain. Read .pm/ files and answer questions about the
  project's architecture, rules, history, current status, or any aspect
  of its knowledge base. Generate reports on demand.
---

# pm-query — ProMem Knowledge Query

This skill reads the ProMem directory and answers questions or generates
reports about the project.

---

## How It Works

When the user asks a question about the project that can be answered from
ProMem, this skill determines which `.pm/` files to read:

| Question Type | Files to Read |
|---------------|---------------|
| "What does this project do?" | `01_Foundations/Brief.md` |
| "What's the tech stack?" | `03_Specifications/Architecture.md` |
| "Where is the database code?" | `04_Execution/Anatomy.md` |
| "What are the coding rules?" | `04_Execution/Cerebrum.md` |
| "What was done yesterday?" | `04_Execution/Memory.md` |
| "Why did we choose X?" | `04_Execution/ADR.md` |
| "What bugs are known?" | `04_Execution/Buglog.md` |
| "What's the roadmap?" | `02_Planning/Roadmap.md` |
| "Give me a full status report" | All files |

---

## Report Generation

When the user requests a report, read the relevant files and produce a
structured summary. Available report types:

### Status Report
```markdown
# Project Status Report — [Date]

## Overview
[From Brief.md]

## Current Phase
[From Roadmap.md]

## Recent Activity
[Last 3-5 entries from Memory.md]

## Open Issues
[From Buglog.md — count and top 3 by severity]

## Active Rules
[Count from Cerebrum.md, highlight any recently added]
```

### Health Check
```markdown
# ProMem Health Check — [Date]

## File Completeness
| File | Status | Last Updated |
|------|--------|-------------|
| Brief.md | Populated / Empty / Template-only |  |
| Architecture.md | ... |  |
| Anatomy.md | ... |  |
| ... | ... |  |

## Memory Size
- Entries: [count]
- Lines: [count]
- Recommendation: [OK / Consider compaction]

## Cerebrum Rules
- Total: [count]
- Categories: [list]

## Gaps
- [List any files that are still in template state]
```

---

## Rules

1. **Read, don't guess.** Only answer from what's written in `.pm/` files.
   If the information isn't there, say so.
2. **Cite your source.** When answering, reference which file the
   information came from.
3. **Stay read-only.** This skill never modifies `.pm/` files. For updates,
   use the appropriate skill (pm-memory, pm-compact, etc.).
4. **Token-efficient.** Don't read all files for a simple question. Read
   only what's needed per the table above.
