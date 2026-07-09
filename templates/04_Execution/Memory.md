# Memory — Shift Ledger

> This is the agent handoff log. Each entry is a self-contained status
> report. The incoming agent reads the LAST entry to understand where
> to pick up. When this file grows too large, run compaction.

<!-- Entry format:
`- [TX-0042 | YYYY-MM-DD HH:MM | Agent: <agent_name>]: <description of the action or modification>`
The TX id is a sequential transaction number. Reference it from Cerebrum,
ADR, or Buglog entries (e.g. "Source: TX-0042") to link knowledge across
the memory documents.
-->

