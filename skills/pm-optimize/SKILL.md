---
name: pm-optimize
description: >
  Analyze code complexity and quality, then write findings to ProMem.
  Scans for algorithmic hotspots, O(n^2) patterns, N+1 queries, memory
  leaks, and performance problems. Results are stored in .pm/ for
  persistent project knowledge.
---

# pm-optimize — Code Analysis & ProMem Integration

This skill performs deep code analysis and writes findings into the
ProMem directory for persistent reference.

---

## Boundary Against `pm-analyze`

Both skills read code and write to Buglog/Cerebrum, so pick the right one:

| | `pm-optimize` (this skill) | `pm-analyze` |
|---|---|---|
| Scope | Narrow — complexity, perf, dependency health | Broad 5-Pillar Framework — architecture, perf, security, tech debt, UX |
| Output | Writes directly to Buglog/Cerebrum/Anatomy, no report files | Single unified report in `.pm/05_Resources/Analysis/`, then syncs to Buglog/Cerebrum/Anatomy |
| Typical trigger | "check for perf issues", periodic upkeep | "audit the project", "give me a scorecard" |
| Cost | Cheap, fast, safe to run often | Expensive, thorough, meant to be occasional |

Use `pm-optimize` for a quick, targeted scan. Use `pm-analyze` when the user
wants a full audit with scored findings and a written report.

---

## When to Run

- After `pm-init` to enrich the initial brain with quality data
- Before/after major development milestones
- When the user requests a code quality review
- Periodically (user's discretion) to keep ProMem current

---

## Analysis Scope

### 1. Complexity Hotspots
Scan for algorithmic complexity issues:
- Nested loops (O(n²) or worse)
- Repeated array/list scans where a Set/Map would suffice
- N+1 query patterns in database access
- Unnecessary re-renders in UI frameworks

### 2. Code Quality
- Functions exceeding 50 lines
- Files exceeding 300 lines
- Deeply nested conditionals (3+ levels)
- Duplicated logic across files
- Dead code (unused exports, unreachable branches)

### 3. Dependency Health
- Outdated major versions
- Dependencies with known vulnerabilities (if checkable)
- Unused dependencies (declared but never imported)

### 4. Pattern Compliance
Read `.pm/04_Execution/Cerebrum.md` first. Check if current code
violates any established rules.

---

## Output Distribution

Write findings to the appropriate ProMem files:

### → `04_Execution/Buglog.md`
Add new entries to the Open Issues table:

```markdown
| ID | Severity | Description | File(s) | Status |
|----|----------|-------------|---------|--------|
| OPT-001 | Medium | O(n²) nested loop in user search | src/search.ts:45 | Open |
| OPT-002 | Low | Unused dependency: lodash | package.json | Open |
```

### → `04_Execution/Cerebrum.md`
If analysis reveals a pattern that should become a permanent rule:

```markdown
## [Optimization Rule]
- **Source:** pm-optimize analysis from [date]
- **Rule:** [what should always/never be done]
- **Rationale:** [performance data or reasoning]
```

Only add to Cerebrum if the finding is **recurring or structural**.
One-off bugs go to Buglog only.

### → `04_Execution/Anatomy.md`
If new files or modules were discovered that aren't in the current
index, update the Anatomy map.

---

## Report

Present a summary after analysis:

```
Code Analysis Complete — [Date]

Scanned: [count] files across [count] modules
Complexity hotspots: [count]
Quality issues: [count]
Dependency issues: [count]
Cerebrum violations: [count]

Top 3 findings:
1. [Most critical finding with file:line]
2. [Second most critical]
3. [Third]

Updated:
  .pm/04_Execution/Buglog.md    — [count] new issues added
  .pm/04_Execution/Cerebrum.md  — [count] new rules (if any)
  .pm/04_Execution/Anatomy.md   — [updated / no changes]
```

---

## Rules

1. **Read Cerebrum first.** Check existing rules before analyzing so you
   can detect violations, not just generic issues.
2. **Don't duplicate.** Before adding to Buglog, check if the issue already
   exists (match by file path and description).
3. **Severity matters.** Use consistent severity levels:
   - **Critical:** Production-breaking, data loss risk
   - **High:** Performance degradation, security concern
   - **Medium:** Code quality, maintainability
   - **Low:** Style, minor optimization
4. **Be actionable.** Every finding must include the specific file and line
   number, and a suggested fix or approach.
