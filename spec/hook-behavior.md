# Agent-hook layer behavior

This is the public contract for `pm hook claude` and `pm hook-event`.
Local analysis notes stay in gitignored `Docs/`; this file is what GitHub
visitors and CI can see.

## Goal

Keep the `.pm/` brain fresh and make session handoff automatic. Token
savings are a side effect, not the product.

## Events

| Event | CLI arg | Behavior |
|-------|---------|----------|
| `SessionStart` | `session-start` | Injects the last Memory TX and Cerebrum rule titles (capped). |
| `Stop` | `stop` | Reminds when files were edited with no Memory TX; runs `pm update` once if the brain is stale. |
| `PostToolUse` (`Write\|Edit`) | `post-write` | Marks the brain stale and records edited files in `.pm/.session.json`. |
| `PreToolUse` (`Read`) | `pre-read` | Prints the file's one-line Anatomy description, if annotated. |

## Invariants

1. Every hook exits `0`. Missing brain, bad stdin, or a held lock become silent no-ops.
2. Hooks never block the agent or the user's work.
3. Installer merges into `.claude/settings.json` and never clobbers unrelated entries.
4. `.pm/.session.json` is ephemeral and must not be committed.
5. ProMem behaves the same when the hook layer is not installed.

## Out of scope

No token ledger, waste dashboard, or daemon. Memory-first, not a token product.
