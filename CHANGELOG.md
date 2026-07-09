# Changelog

All notable changes to ProMem are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Versioning: [SemVer](https://semver.org/).

## [1.2.1] — 2026-07-09

### Fixed
- **Brain detection now requires layer structure.** A directory that merely
  happens to be named `ProMem` (such as a clone of this repository at
  `~/ProMem`) is no longer mistaken for a project brain — previously
  `pm status` could create layer directories inside it. Candidates must
  contain `04_Execution/` or `01_Foundations/`.
- `pm init` refuses to run from a subdirectory of a git repository; the brain
  belongs at the repository root, where upward resolution can find it.
- A refused `pm compact` (pending compaction already exists) now exits with
  code 2 so scripts and agents can distinguish it from success.
- `pm memory --agent` without a value now errors instead of leaking the flag
  into the message text.

### Added
- `pm link` warns when run from a git worktree (links would die with it).
- `pm status` reports missing core layer files it cannot regenerate.
- `.gitattributes` (LF normalization), this changelog, README CI badge.

## [1.2.0] — 2026-07-09

### Added
- **`pm link`** — one-command skills distribution: detects installed agents
  (Claude Code, Codex, Gemini/Antigravity, Cursor, generic `.agents`) and
  links the `pm-*` skills into their skill roots. Junctions on Windows (no
  admin rights), symlinks elsewhere. Non-destructive and idempotent.

## [1.1.0] — 2026-07-09

### Added
- **Universal brain resolution** — commands work from any subdirectory and,
  inside git worktrees, resolve to the main checkout's brain. `pm init`
  refuses to create a second brain when one is already resolvable.
- `pm hook` is worktree-aware (installs into the repo's common git dir).
- GitHub Actions CI: 3 operating systems × Node 18/20/22.

## [1.0.1] — 2026-07-09

### Fixed
- `pm compact` contract aligned between code, tests, and skills (pending-file
  staging model); English-only CLI output; absolute-path git hook fallback;
  stale-lock recovery; `.gitignore`-aware scanning; consent-based entrypoint
  handling; markdown table-cell escaping; `requires-python` detection.

### Added
- Sequential `TX-####` transaction ids in the shift ledger, enabling
  cross-references from Cerebrum, ADR, and Buglog entries.

## [1.0.0] — 2026-07-08

Initial release: 5-layer `.pm/` structure, `pm init/update/memory/compact/
status/hook`, 9 agent skills, zero-dependency pure-Node CLI.
