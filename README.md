# ProMem — Project Memory Framework

[![tests](https://github.com/polyfoil/ProMem/actions/workflows/test.yml/badge.svg)](https://github.com/polyfoil/ProMem/actions/workflows/test.yml)

> **Memory belongs to the project, not the agent.**

ProMem is a holistic memory harness for software projects. It gives any AI agent — Claude, Cursor, Copilot, Codex, or any future model — instant, complete understanding of your project by maintaining a structured, persistent Second Brain alongside your code.

---

## Philosophy & Origin

ProMem is built on three core philosophical pillars:

### 1. Acknowledgement (The OpenWolf Inspiration)
ProMem was deeply inspired by the [OpenWolf](https://github.com/cytostack/openwolf) Protocol, which pioneered the idea of giving an AI a persistent `.wolf` memory folder (`Memory.md`, `Cerebrum.md`). We took that brilliant concept and industrialized it. While OpenWolf was a manual note-taking protocol, ProMem is a strict, automated **5-layer orchestration framework**. We replaced manual file creation with instant CLI scaffolding, introduced file locking to prevent AI race conditions, and separated the "noise" (Shift Ledger) from the "signal" (Architecture).

### 2. Zero-Dependency & Pure JS
ProMem requires exactly zero `node_modules`. We purposefully built it using only native Node.js (`fs`, `path`) and plain Markdown (`.md`) files. 
- **Frictionless:** Anyone can clone and run it instantly on any machine or CI/CD pipeline without running `npm install`.
- **Secure:** Zero external packages means zero supply-chain vulnerability risks.
- **Universal:** Markdown is the native tongue of every LLM. You don't need a proprietary database API for your AI to read your project's memory.

### 3. True Token Economy (Physical Restriction)
Many tools boast about saving tokens using estimated dashboards. ProMem enforces token economy through physical constraints:
- **No Blind Scanning:** Agents do not run `ls -R` or `grep` across thousands of files. They read the 2,000-token `Anatomy.md` index once, and jump straight to the exact file they need.
- **No Context Bloat:** The `pm compact` command stages the full ledger into the `Archive/` folder; your agent then distills it into a short "The Story So Far" summary, keeping the active `Memory.md` lean (the CLI warns when it grows past a few hundred lines). Your agent only reads what matters *today*.

---

## The Problem

Every time you start a new AI session, you re-explain your project. Every time you switch agents, context is lost. Architectural decisions vanish into chat logs. Coding standards are forgotten. The next agent starts from zero.

Existing memory solutions (`.cursor-rules`, agent memory files) track only **what happened during development**. They're a diary — not a brain.

## The Solution

ProMem creates a **5-layer knowledge structure** inside your project that covers everything from *why the project exists* to *what happened today*:

```
.pm/
├── 01_Foundations/    → Brief, Vision, Target Audience
├── 02_Planning/       → Roadmap, Backlog
├── 03_Specifications/ → Architecture, API Contracts, UI/UX Guidelines
├── 04_Execution/      → Anatomy (index), Cerebrum (rules), Memory (shift ledger)
└── 05_Resources/      → Competitors, Inspirations
```

Any agent reads `.pm/` and is immediately productive. No re-explaining. No lost context. No wasted tokens.

---

## What ProMem Truly Is

- **A Relational Memory Database for AI:** It functions as a database, but instead of SQL and tables, it uses interconnected Markdown files as a native graph of knowledge that LLMs natively understand.
- **An Agentic Behavioral Protocol:** It enforces strict operational principles on how agents read, write, and hand off tasks. It prevents AI race conditions and destructive context bloat.
- **A Cognitive Development History:** While Git tracks *what* code changed, ProMem tracks *why* it changed, what was learned (Cerebrum), and what is left to do (Memory/Backlog).

---

## Quick Start

### 1. Global CLI Setup (Terminal)
Clone the repository to a central location on your machine and link it globally. This allows you to run ProMem commands from any project folder without duplicating code.

```bash
git clone https://github.com/polyfoil/ProMem.git ~/ProMem
cd ~/ProMem
npm link
```
*Now the `pm` command is available system-wide.*

### 2. Centralized Skills Hub (For AI Agents)
Your clone is the **single source of truth**. Instead of copying skill files into every agent's configuration folder, link them once:

```bash
pm link
```

`pm link` detects the AI agents installed on your machine and links the `pm-*` skills into each one's skill directory. It is **non-destructive** (existing entries are never touched) and needs **no admin rights** (directory junctions on Windows, symlinks on macOS/Linux).

| Agent | Skills directory |
|-------|------------------|
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| Gemini / Antigravity | `~/.gemini/config/skills/` |
| Cursor | `~/.cursor/skills/` |
| Generic (AGENTS.md tooling) | `~/.agents/skills/` |

Because these are links — not copies — a single `git pull` in your clone updates every agent on your machine instantly.

**Prefer manual control?** Point your agent's skills directory at the folders under `<your-clone>/skills/` yourself, e.g.:

```bash
ln -s ~/ProMem/skills/pm-* ~/.claude/skills/        # macOS / Linux
```
```powershell
# Windows — junctions work without admin rights:
Get-ChildItem "$env:USERPROFILE\ProMem\skills" -Directory | ForEach-Object {
  New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\$($_.Name)" -Target $_.FullName
}
```

> **Good to know:** links point at your clone's location on disk. If you move or delete the clone, the links go dark — re-clone (or move) and run `pm link` again to refresh them. If your agent's skills directory lives somewhere unusual, set it up manually as above; `pm link` only manages the well-known locations in the table.

### 3. Initialize on your project
Navigate to any project directory where you want to build a persistent memory. You can initialize it using either your AI agent or the built-in CLI tool:

**Option A — Via AI Agent**
Tell your active agent:
```text
"Run pm-init on this project."
```
The agent will scan your codebase, create the `.pm/` directory, and populate it with structured knowledge extracted from your code.

**Option B — Via ProMem CLI**
Alternatively, you can run the zero-dependency CLI tool directly from your terminal:
```bash
# Initialize ProMem in the current directory:
pm init

# Refresh generated Anatomy/Architecture sections after structural changes:
pm update

# Log a manual handoff entry:
pm memory "Added user login endpoint"

# Stage the shift ledger for compaction (your AI agent finalizes the summary):
pm compact

# Run health checks and auto-fix structural issues:
pm status

# Install a Git post-commit hook for automatic updates:
pm hook
```

*Note: `pm hook` embeds the absolute path of your ProMem installation into the hook as a fallback, so auto-updates keep working even when `pm` is not on the PATH (GUI git clients, CI environments, etc.).*

---

## Core Concepts

### Agent Memory vs. Project Memory

| | Agent Memory | Project Memory |
|---|---|---|
| **Scope** | One chat session | Entire project lifecycle |
| **Persistence** | Lost when session ends | Permanent on disk |
| **Portability** | Locked to one vendor | Any agent, any human |
| **Token cost** | Re-explain every session | Read once, work immediately |

### One Brain Per Project (Automatic Resolution)
You can run `pm` from anywhere inside a project. Commands walk up from the current directory to find the `.pm/` (or `ProMem/`) brain, stopping at the repository boundary. Inside a **git worktree** — where the gitignored brain is physically absent — commands automatically resolve to the main checkout's brain, so agents working in worktrees share the same ledger instead of silently losing memory. `pm init` refuses to create a second brain when one is already resolvable, preventing split-brain.

### Index-Driven Token Economy
Agents don't read your entire codebase. `Anatomy.md` provides a compact index (~2,000 tokens) that maps every file and module. Agents consult the index, then read only what they need. **2,500 tokens instead of 100,000+.**

### Sequential Handoff (Shift Ledger)
When one agent's quota expires, it writes a handoff note to `Memory.md`. The next agent reads the last entry and picks up exactly where the previous one left off. No parallel conflicts. No lost progress.

Every ledger entry carries a sequential transaction ID (`TX-0042`). Rules in `Cerebrum.md`, issues in `Buglog.md`, and decisions in `ADR.md` can reference the exact ledger event they came from (`Source: TX-0042`), forming a lightweight, greppable relation graph across the memory files.

### Manual Compaction
When `Memory.md` grows too large, you trigger a manual cleanup. `pm compact` stages the full ledger into `Archive/` as a pending file; your AI agent (via the `pm-compact` skill) then promotes permanent lessons to `Cerebrum.md`, writes a "The Story So Far" summary into the fresh `Memory.md`, and finalizes the archive. Active memory stays lean.

---

## Skills

ProMem ships with a modular skill collection:

| Skill | Purpose |
|-------|---------|
| `pm-init` | Scan a project and create the `.pm/` directory with populated templates |
| `pm-memory` | Manage the shift ledger (handoff entries) |
| `pm-compact` | Manual memory compaction (promote, archive, clean) |
| `pm-query` | Read `.pm/` and answer questions about the project |
| `pm-optimize` | Analyze code complexity and write findings to ProMem |
| `pm-brainstorm` | ProMem-aligned collaborative requirements and design refiner |
| `pm-migrate` | One-way OpenWolf (`.wolf`) → ProMem migration; archives the legacy brain into `.pm/Archive/` |


Each skill follows the **Unix philosophy**: do one thing well, share the same I/O (the `.pm/` directory).

---

## How It Works

### The Architecture

```
┌─────────────────────────────────────────┐
│              Your Project               │
│                                         │
│  src/  tests/  package.json  ...        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │           .pm/ (ProMem)           │  │
│  │                                   │  │
│  │  01_Foundations/  02_Planning/    │  │
│  │  03_Specifications/               │  │
│  │  04_Execution/   05_Resources/    │  │
│  └───────────────┬───────────────────┘  │
│                  │ read / write         │
│        ┌─────────┴─────────┐            │
│        │   ProMem Skills   │            │
│        │                   │            │
│        │  pm-init          │            │
│        │  pm-memory        │            │
│        │  pm-compact       │            │
│        │  pm-query         │            │
│        │  pm-optimize      │            │
│        │  ...extensible    │            │
│        └───────────────────┘            │
└─────────────────────────────────────────┘
```

### The Agent Workflow (A Day in the Life)

ProMem is frictionless and unobtrusive. Instead of acting as an active proxy that intercepts every file read, ProMem acts as a well-structured library that agents consult proactively.

```text
You start a new session: "Add a login endpoint"
    ↓
Agent reads .pm/01_Foundations/Brief.md (Understands the goal)
    ↓
Agent reads .pm/04_Execution/Cerebrum.md (Learns past mistakes & rules)
    ↓
Agent checks .pm/04_Execution/Anatomy.md (Finds exactly which files to edit, without blind scanning)
    ↓
Agent writes code & completes the task
    ↓
You run `git commit`
    ↓
ProMem Git Hook (Runs silently in background, updates Anatomy & Architecture automatically)
    ↓
Agent runs `pm memory` (Logs what it just did for the next session/agent)
```

---

## License

[MIT](LICENSE)
