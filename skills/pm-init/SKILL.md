---
name: pm-init
description: >
  Initialize ProMem on any software project. Scans the codebase, identifies
  tech stack, maps directory structure, extracts TODOs, and populates the
  5-layer .pm/ directory with structured project knowledge. Use when a
  project has no .pm/ directory and needs a Project Memory brain.
---

# pm-init — ProMem Initialization Skill

This skill bootstraps a complete ProMem brain for any software project by
scanning its codebase and populating the 5-layer directory structure.

---

## Prerequisites

Before running init, confirm:
1. The project has **no existing `.pm/` directory** (if it does, abort and
   inform the user — do not overwrite).
2. You are at the **project root** (where `package.json`, `pyproject.toml`,
   `go.mod`, or equivalent manifest lives).

---

## Phase 1: Discovery

### 1.1 Detect Project Type

Scan the project root for manifest files to identify the tech stack:

| File | Ecosystem |
|------|-----------|
| `package.json` | Node.js / JavaScript / TypeScript |
| `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `*.csproj`, `*.sln` | .NET / C# |
| `pom.xml`, `build.gradle` | Java / Kotlin |
| `Gemfile` | Ruby |
| `composer.json` | PHP |

Read the manifest to extract:
- Project name and version
- Dependencies (production + dev)
- Scripts / entry points
- Engine/runtime requirements

### 1.2 Map Directory Structure

Generate a complete directory tree of the project. For each directory:
- Count files by extension
- Note apparent purpose (e.g., `src/components/` → UI components)
- Identify entry points (`index.ts`, `main.py`, `cmd/`, etc.)

Exclude from mapping: `node_modules/`, `.git/`, `dist/`, `build/`,
`__pycache__/`, `.venv/`, `vendor/`, and other standard ignore patterns.

### 1.3 Analyze Key Files

For the **top 20-30 most important files** (entry points, configs,
core modules), read the first 50 lines to capture:
- Module purpose (from comments, docstrings, or file name)
- Exports / public API
- Key imports and dependencies

Do NOT read every file. This is an index, not a full audit.

### 1.4 Scan for Issues

Perform both a comment scan and a semantic code quality/structural audit of the codebase:
1. **Comment Scan:** Search the codebase for `TODO`, `FIXME`, `HACK`, `XXX`, or `BUG` comments.
2. **Structural Audit:** Analyze key modules for architectural risks and patterns:
   - Gaps in error handling (e.g. empty catch/except blocks, unlogged failures).
   - Inefficiencies or performance risks (e.g. redundant I/O loops, costly nested iterations).
   - Hardcoded values (e.g. hardcoded API endpoints, repositories, URLs, credentials).
   - Architectural vulnerabilities (e.g. unauthenticated API rate-limiting issues).

Record the file path, location, severity, and a brief description for each finding.


---

## Phase 2: Build

### 2.1 Create Directory Structure

Create the `.pm/` directory with all 5 layers:

```
.pm/
├── 01_Foundations/
│   ├── Brief.md
│   └── Vision.md
├── 02_Planning/
│   ├── Roadmap.md
│   └── Backlog.md
├── 03_Specifications/
│   ├── Architecture.md
│   ├── API_Contracts.md
│   └── UI_UX_Guidelines.md
├── 04_Execution/
│   ├── Anatomy.md
│   ├── Cerebrum.md
│   ├── Memory.md
│   ├── ADR.md
│   └── Buglog.md
├── 05_Resources/
│   ├── Competitors.md
│   └── Inspirations.md
└── Archive/
```

### 2.2 Populate Files

Using the data collected in Phase 1, write to each file:

#### `01_Foundations/Brief.md`
- **Overview:** What the project does (inferred from README, manifest
  description, or main module comments)
- **Problem Statement:** Best guess from available context
- **Target Audience:** Infer from project type (library → developers,
  web app → end users, CLI → ops engineers)
- **Scope:** List discovered features and modules

#### `03_Specifications/Architecture.md`
- **Tech Stack:** Complete table from manifest analysis
- **Directory Structure:** Annotated tree from Phase 1.2
- **Key Design Decisions:** Any patterns observed (MVC, component-based,
  microservices, monolith, etc.)

#### `04_Execution/Anatomy.md`
**This is the most critical file.** It must be:
- Compact (target: 1,000-2,000 tokens max)
- Navigable (agents use this as their primary map)
- Accurate (every path must be correct)

Format:
```markdown
## Project Root
<tree output>

## Key Files
| File | Purpose |
|------|---------|
| src/index.ts | Application entry point |
| src/db/connection.ts | Database connection setup |
| ... | ... |

## Module Map
### [Module Name]
- Entry: src/module/index.ts
- Purpose: [one line]
- Key files: file.ts (description), ...
```

#### `04_Execution/Buglog.md`
- Populate the Open Issues table with both comment-based findings (TODO/FIXME) and structural audit findings (hardcoded URLs, error handling gaps, rate limit risks) from Phase 1.4.
- Set severity based on impact (FIXME/Critical rate-limit risks → High, TODO/minor gaps → Medium, hardcoded strings → Low).

#### Agent Entrypoints (Consent-Based Merge)
- Check for existing `.cursorrules`, `CLAUDE.md`, and `AGENTS.md` files in the project root.
- If they do not exist, create all three with the mandatory ProMem operating rules (e.g. read Brief and Cerebrum, log handoffs to Memory). `AGENTS.md` is the emerging cross-agent standard; `.cursorrules` is kept for Cursor backward compatibility.
- If they DO exist, DO NOT modify them without consent — these are user-maintained files. Ask the user for approval first; upon approval, PREPEND the ProMem mandatory rules to the very top of the file, preserving all existing content. Never overwrite.
- Note: the `pm init` CLI deliberately never touches existing entrypoint files — merging into them is this skill's (consent-gated) responsibility.

#### Other Files
Leave `Cerebrum.md`, `Memory.md`, `ADR.md`, `Vision.md`, `Roadmap.md`,
`Backlog.md`, `API_Contracts.md`, `UI_UX_Guidelines.md`, `Competitors.md`,
and `Inspirations.md` with their template headers only. These will be
populated during development.

### 2.3 Write Initial Memory Entry

Add the first entry to `Memory.md` using the single-line transaction format
(the same format used by the `pm memory` CLI and enforced by `pm compact`):

```markdown
- [TX-0001 | YYYY-MM-DD HH:MM | Agent: <your_name>]: ProMem initialized — scanned project, created .pm/ directory, populated Brief, Architecture, Anatomy, and Buglog. Next: review generated docs for accuracy.
```

---

## Phase 3: Report

Present a summary to the user:

```
ProMem initialized successfully.

Project: [name]
Type: [ecosystem]
Files scanned: [count]
Modules found: [count]
TODOs/issues found: [count]

Generated:
  .pm/01_Foundations/Brief.md     — Project overview
  .pm/03_Specifications/Architecture.md — Tech stack & structure
  .pm/04_Execution/Anatomy.md    — File index (token-efficient map)
  .pm/04_Execution/Buglog.md     — [count] open issues from code scan

Recommended next steps:
1. Review Brief.md for accuracy
2. Add project-specific rules to Cerebrum.md
3. Begin development with full ProMem context
```

---

## Rules

1. **Never overwrite an existing `.pm/` directory.** If one exists, inform
   the user and stop.
2. **Keep Anatomy.md compact.** If the project has 500+ files, summarize
   by module — do not list every file.
3. **All output in English.** ProMem is language-neutral for maximum
   portability.
4. **Do not fabricate information.** If you cannot determine the project's
   purpose, write "Purpose not determined from available source files" in
   Brief.md rather than guessing.
5. **Respect .gitignore.** Do not index files or directories that are
   gitignored.
