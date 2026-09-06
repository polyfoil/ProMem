# Contributing to ProMem

## Development

```bash
git clone https://github.com/polyfoil/ProMem.git
cd ProMem
npm test
```

There are no production dependencies. Node 18 or later is required.

## Rules

- Keep the CLI zero-dependency (Node stdlib only).
- Add or extend tests under `tests/` for behavior you change. `npm test` must stay green.
- Do not commit `.pm/`, `Docs/`, or personal agent entrypoints (`CLAUDE.md`, `.cursorrules`).
- Ledger examples must use the single-line `TX-####` format (`tests/format-lint.test.js` enforces this).
- New skills go in `skills/<name>/SKILL.md` and must be listed in the README skills table.

## Pull requests

1. Fork and branch from `main`.
2. Run `npm test`.
3. Open a PR using the template. Describe *why*, not only *what*.

## License

Contributions are accepted under the [MIT License](LICENSE).
