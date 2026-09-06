# Security policy

## Supported versions

The `main` branch of this repository is the supported line.

## What this project can affect

ProMem writes Markdown under `.pm/`, can install a git `post-commit` hook, and
can merge entries into `.claude/settings.json`. It has no runtime network
calls and no npm dependencies.

## Reporting a vulnerability

Do not open a public issue for a security report.

1. Use [GitHub Security Advisories](https://github.com/polyfoil/ProMem/security/advisories/new), or
2. Email the maintainer via the address on their GitHub profile if advisories are unavailable.

Include: affected command, steps to reproduce, and impact (data loss, hook
injection, unexpected writes outside `.pm/`).

We will acknowledge valid reports and ship a fix on `main` before any public
write-up.
