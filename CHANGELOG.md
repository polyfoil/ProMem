# Changelog

All notable changes to ProMem are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Versioning: [SemVer](https://semver.org/).

## [1.4.6] — 2026-09-06

### Added
- Public hook contract at `spec/hook-behavior.md` so GitHub visitors are not
  pointed at a gitignored `Docs/` path.
- CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, and GitHub issue/PR templates.
- Turkish README (`README.tr.md`); English README links it in the header.

### Changed
- README documents `npm install -g github:polyfoil/ProMem` so the CLI can be
  installed without waiting for a registry publish.
- Code comments for the agent-hook layer point at `spec/hook-behavior.md`.
- Awkward-path tests no longer crash when `sh` is missing from PATH (they still
  require the generated post-commit hook file).

## [1.4.5] — 2026-09-05

### Fixed
- **Reverted the `Docs/HOOK-BEHAVIOR-SPEC.md` repointing from 1.4.2.** That
  change rested on a false premise: the audit looked for the file inside a git
  worktree, where `Docs/` never appears because it is gitignored, and concluded
  the document did not exist. It does — it is the maintained behavior spec for
  the agent-hook layer. The four references in `hookEvent.js`, `hookClaude.js`
  and this changelog now point at it again.
- Removed the accompanying changelog claim that the spec "is not in the
  repository and never could be". `Docs/` is deliberately local-only; the
  pointers are for the people who have it, and were working as intended.

## [1.4.4] — 2026-09-05

### Changed
- The TODO scanner skips files under `tests/` and `test/`. Test files write
  `TODO`/`FIXME` strings as fixture *data*, not as real debt, so scanning them
  filled Buglog with rows nobody could act on — in this repository they were
  5 of 6 rows. Measured before/after on the repo itself.
- The Cerebrum template carries the no-duplicate rule that this project's own
  brain already had: read the whole document before adding a rule, and update
  a related rule instead of appending a near-copy. Every brain created by
  `pm init` now starts with it.

## [1.4.3] — 2026-09-05

Stability pass. No new defects were found in the 6th audit round; this release
hardens error paths and locks in behavior that previously worked untested.

### Added
- `pm init` rolls back on failure. If any step after the directory creation
  throws (disk full, permissions, a file lock), the incomplete `.pm/` is
  removed and the user is told they can simply run `pm init` again. The
  precondition check guarantees no brain existed beforehand, so removing it
  restores the project exactly. Previously a half-written brain survived and
  the next `pm init` refused to run because the directory already existed.
- `ENOSPC` (disk full) and `EROFS` (read-only filesystem) are diagnosed by
  name instead of surfacing as a raw error message.
- Regression tests for project paths containing spaces and non-ASCII
  characters, and for an empty project. All six commands are exercised from
  each, and the generated post-commit hook is actually executed. This already
  worked — it was simply never covered, and every generated artifact embeds a
  path somewhere.

### Changed
- Error classification extracted from `runCli` into a pure `describeError`
  function: cognitive complexity 45 → 33, cyclomatic 16 → 13. It was the one
  genuine complexity outlier in the codebase (next highest: 26). All four
  existing messages are unchanged.

### Notes
- A complexity audit found no algorithmic bottleneck: 89 functions, mean
  cyclomatic 3.55, mean cognitive 6.01, maximum nested-loop depth 2 (file ×
  line, linear in input size), no N+1 access and no unguarded recursion. The
  bundled heuristic scanner reported 80 "HIGH" findings; all 80 were false
  positives. See `Docs/2026-09-05_1546_complexity.md`.
- The `pm init` rollback has no automated test: every intermediate step
  already swallows its own errors, so there is no deterministic injection
  point. It is defensive hardening, not a proven fix.

## [1.4.2] — 2026-08-28

### Fixed
- **Anatomy annotations no longer die at the Key Files row cap.** v1.4.1 carried
  annotations across a refresh, but the generator applied the 20-row cap
  *before* looking descriptions up, so an annotated file pushed past the cap by
  a newly added file lost its description outright — and the command still
  reported it as preserved. An annotated file is now a key file by definition:
  the cap rations only un-annotated rows. This repository was already over the
  cap (22 eligible files, 20 rows), so the bug was live, not theoretical.
- The preserved-annotation count is computed from the rows actually written
  back rather than from the parsed map, and annotations dropped because their
  file no longer exists are reported separately instead of counted as success.
- **`npm test` ran only four hard-coded files.** Any test file added without
  editing `package.json` was silently skipped, locally and in CI — verified by
  dropping in a deliberately failing file that the suite never noticed. The
  script now uses the test runner's own discovery.
- Stale-lock recovery re-reads the lock immediately before unlinking it and
  removes it only if it is byte-for-byte the lock it judged stale. Deciding and
  deleting are separate syscalls; in between, the owner can exit and a third
  process can take the lock, and the old code would then delete a *live* lock
  and admit two writers. The remaining window is the unlink itself.
- `stop` clears the brain's stale flag only when the refresh actually ran.
  `runUpdate` now returns whether it ran; when the lock was held it returned
  early while the caller cleared the flag anyway, stranding a stale brain.
- `pm hook claude` repoints a registration whose command still names a pm.js
  path from a previous installation location. Such an entry fails on every
  event, and the installer used to report "already installed" and leave it.
- Removed two dead imports from `src/cli.js`, left behind when the entry-point
  logic moved to `pm.js`.

### Changed
- `pm hook claude` appends the ephemeral session-state file to an existing
  `.gitignore` instead of only printing a hint. A project without a `.gitignore`
  still just gets the hint — creating one would be an unrelated change.
- The git post-commit script moved from an inline string in `hook.js` to
  `templates/hooks/post-commit`, completing the "templates/ is the single
  source of truth for generated static content" rule from v1.4.0. It also now
  tells the user to re-run `pm hook` when the installation has moved.
- `runStatus` split into four focused checks (directories, ledger, core files,
  pending compaction), each reporting its own issue/fix counts.
- The `pm-protocol` skill declares `name: pm-protocol`; it previously declared
  `promem-operating-protocol`, which is not the name it is invoked by.
- Cerebrum rule sources cite a TX id everywhere they are documented; the
  template and two skills each taught a different `Source:` format.
- `CHANGELOG.md` is included in the published package.

### Tests
- Key Files cap boundary: an annotated row outranks an un-annotated one when
  the cap binds, and a dropped annotation is reported as dropped.
- A lock held by a living process survives a competing acquisition byte-for-byte.
- `pm hook claude` repoints a stale command path without duplicating it, and
  writes the session-state entry into an existing `.gitignore` exactly once.
- Format-drift guards: every skill declares its own directory name, and every
  documented rule source cites a TX id.
- 107 tests total (98 before), now discovered automatically.

## [1.4.1] — 2026-08-28

### Fixed
- **`pm update` no longer erases Anatomy annotations.** The Key Files table is
  regenerated on every refresh, so the descriptions an agent wrote there (as
  the pm-init skill instructs) were reset to the placeholder on the next
  refresh — including the automatic ones from the git post-commit hook and the
  `stop` hook. The refresh now reads the existing table, carries every
  annotation across by file path, drops the rows of files that no longer
  exist, and reports how many it preserved. This also makes the `pre-read`
  Anatomy card useful beyond the first commit: it reads exactly those
  descriptions and suppresses the placeholder.
- `splitTableRow` / `parseKeyFileDescriptions` split a generated table row on
  its real delimiters only, so an escaped `\|` inside cell text no longer
  shifts every following column.
- ~~The four references to `Docs/HOOK-BEHAVIOR-SPEC.md` were repointed at the
  README.~~ **Reverted in 1.4.5 — the claim behind this was wrong; the
  document exists.**

### Removed
- **Incremental Buglog scanning (OPT-2).** `pm update` is a full rescan again.
  The scan is already bounded by an extension filter and a 1 MB file ceiling
  and was never measured as a bottleneck, while re-reading the table it had
  just written cost three defect classes: rows for files deleted outside the
  session survived forever, files changed by anything other than the agent
  were never rescanned, and a description containing `|` was parsed back into
  the wrong columns. `runUpdate` no longer takes an `edits` option.

### Changed
- `KEY_FILE_PLACEHOLDER` moved to `constants.js` — it is a contract between the
  generator, the refresh, and the pre-read hook, and was duplicated as a
  literal in two of them.
- README's skill table lists all nine skills (`pm-analyze` and `pm-protocol`
  were missing) and `tests/format-lint.test.js` now pins that table to the
  `skills/` directory listing, the same way it already pins the ledger format.

### Tests
- Anatomy annotation lifecycle: an annotation survives a refresh, a new file
  gets the placeholder, a deleted file drops out with its annotation, and an
  escaped pipe survives the round trip (98 tests total).

## [1.4.0] — 2026-07-10

### Added
- **Agent-hook layer** (`pm hook claude` + `pm hook-event <event>`): optional,
  Claude Code-compatible hooks whose sole job is keeping the `.pm/` brain
  fresh and making session handoff automatic (Docs/HOOK-BEHAVIOR-SPEC.md).
  - `session-start` injects the last Memory TX and Cerebrum rule titles as
    session context (< 40 lines).
  - `stop` reminds when files were edited without a Memory TX, gently asks
    about Cerebrum after 3+ edits, and runs the `pm update` repair exactly
    once when the brain is stale.
  - `post-write` tracks edited files in the ephemeral `.pm/.session.json`
    and marks the brain stale (brain-internal paths ignored).
  - `pre-read` surfaces the target file's Anatomy description, if annotated.
  - All events always exit 0 — no brain, malformed stdin, or a held lock
    degrade to silent no-ops; hooks can never block the agent.
- `tryAcquireLock` in `src/utils/lock.js`: non-fatal lock variant for hooks
  (few quick retries, then give up instead of exiting).
- Installer merges into existing `.claude/settings.json` without touching
  unrelated entries; refuses to clobber unparseable files; idempotent.
- `pm update` now also refreshes Buglog's Open Issues from the TODO/FIXME
  scanner — scanner rows (`ISSUE-`) are regenerated, manually added rows are
  preserved verbatim (closes the "stale issue list" audit finding).
- Format-drift guard test suite (`tests/format-lint.test.js`): pins the
  canonical single-line TX ledger format across skills/templates/README,
  pins template table headers to the code generators, and verifies every
  `loadTemplate()` reference exists on disk (closes the P1 audit finding).

### Changed
- Agent entrypoint contents (`.cursorrules`, `CLAUDE.md`, `AGENTS.md`) moved
  from inline strings in `init.js` to `templates/entrypoints/` — templates/
  is now the single source of truth for all generated static content.

### Decided (won't fix — deliberate scope)
- `link.js` agent-root list stays in code (canonical registry per Cerebrum);
  an external config file adds surface without a demonstrated need.
- No token ledger, waste detection, daemon, or dashboard — see
  Docs/HOOK-BEHAVIOR-SPEC.md §3 (memory-first, not a token product).

## [1.3.1] — 2026-07-10

### Changed
- `walkProject` collects tree lines in an array and joins once, removing the
  quadratic string-copy risk on very large repositories (OPT-013).

## [1.3.0] — 2026-07-10

### Added
- `pm init` now also generates `AGENTS.md` when absent — the emerging
  cross-agent standard entrypoint (`.cursorrules` kept for compatibility).
- Unit tests for stale-lock recovery (dead-PID takeover, age-based takeover).
- pm-memory skill rule: a change that resolves a Buglog item must close it in
  the same session, citing the fixing TX id.

### Changed
- `runLink` refactored under the 50-line function rule (per-agent linking
  extracted to a helper); `link.js` is documented as the canonical agent-root
  registry, mirrored by the README table.
- TODO scanner skips files larger than 1 MB (generated bundles carry no signal).
- Ledger TX sequencing scans only the newest archive file (falls back to older
  ones only when it yields no ids) instead of rescanning the whole archive on
  every write.

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
