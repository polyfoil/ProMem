# ProMem Guidelines

## Guidelines
- Before starting any task, read `.pm/01_Foundations/Brief.md` and `.pm/04_Execution/Cerebrum.md`.
- Use `.pm/04_Execution/Anatomy.md` to locate files instead of broad scans.
- Log a handoff entry to `.pm/04_Execution/Memory.md` at the end of every session.

## Code Discovery (if a codebase-memory MCP server is available)
- Prefer knowledge-graph tools (`search_graph`, `search_code`, `trace_path`, `get_code_snippet`, `get_architecture`) over blind grep/glob for code symbols and call chains.
- If the repository is not indexed yet, run `index_repository` on the repo root first.
- ProMem (`.pm/`) holds intent memory (rules, decisions, ledger); the code graph holds structural memory — use both together.

