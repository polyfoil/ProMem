---
name: pm-analyze
description: >
  Perform a deep, unified 5-pillar architectural and code quality audit of the project.
  Analyzes tech stack, data flow, code quality, optimization, security, and UX.
  Generates a single comprehensive markdown report inside .pm/05_Resources/Analysis/
  and updates ProMem files.
---

# pm-analyze — Deep Project Audit and Quality Analysis

This skill performs a comprehensive 5-pillar architectural review, optimization assessment, and feature mapping of the codebase.

---

## Boundary Against `pm-optimize`

Both skills read code and write to Buglog/Cerebrum, so pick the right one based on scope and cost:

| | `pm-analyze` (this skill) | `pm-optimize` |
|---|---|---|
| Scope | Broad 5-Pillar Framework — architecture, performance, security, tech debt, UX | Narrow — complexity, perf, dependency health |
| Output | Single unified report in `.pm/05_Resources/Analysis/`, then syncs to Buglog/Cerebrum/Anatomy | Writes directly to Buglog/Cerebrum/Anatomy, no report files |
| Typical trigger | "audit the project", "give me a scorecard" | "check for perf issues", periodic upkeep |
| Cost | Expensive, thorough, meant to be occasional | Cheap, fast, safe to run often |

If the user wants a quick complexity/perf pass, use `pm-optimize` instead — don't run a full audit for a narrow question.

---

## Preparation

1. Read `.pm/04_Execution/Anatomy.md` to understand the file directory map.
2. Read the main manifest files (`package.json`, `requirements.txt`, etc.) to review active dependencies.
3. Read the core modules, domain logic, and tests.

---

## The 5-Pillar Analysis Scope

Evaluate the active codebase strictly through these 5 pillars. (Focus on logic and algorithms; do not assess code comments themselves unless they are TODOs).

1. **Architecture & Design**
   - Architectural Patterns: Appropriateness of patterns used (MVC, Clean Arch, etc.).
   - Modularity & Hierarchy: Folder structure, component hierarchy, and Separation of Concerns (SoC).
   - Clean Code Principles: Code readability, naming conventions, and DRY/SOLID compliance.
   - Over-Engineering & Complexity: Unnecessary abstractions or overly complex structures.
   - Reusability: Effectiveness of shared components and services.

2. **Performance & Optimization**
   - Render & Loop Optimization: Inefficient loops (e.g., O(n²)), data processing strategies.
   - Async Operations Management: Promise chains, async/await usage, detection of long-running operations.
   - Network & Data Loading: Caching strategies and unnecessary data transfers.
   - Data Structures: Indexing strategies and data selection efficiency.

3. **Security, Error Handling & QA**
   - Security Analysis: Hardcoded keys, lack of rate limiting, input validation flaws.
   - Error Handling: Try-catch blocks, global error handler structure, user feedback mechanisms.
   - Test Coverage: Status of unit and integration tests; untested critical areas.
   - Debugging & Monitoring: Logging and tracking of performance metrics.

4. **Tech Debt & Modernization**
   - Hard-Coded & Mock Data: Embedded constants and uncleared test data in the code.
   - Deprecated Elements: Outdated libraries or functions.
   - Overlap Issues: Redundant or duplicated functions.
   - Tech Stack Evaluation: Scalability of the current stack and alternative suggestions.

5. **UX & Feature Mapping**
   - Feature Mapping: Mapping all functional features and their purposes in the codebase.
   - UI Component Analysis: Compliance of interface components with UX standards.
   - Feedback Mechanisms: Adequacy of user interactions and system feedback.

---

## Reporting

Write all audit findings as a **single unified markdown report** inside `.pm/05_Resources/Analysis/` named `YYYY-MM-DD_HH-MM_Analysis.md`.

### Document Structure

For each of the 5 pillars, strictly use these subheadings:
- **Current Status (Findings)**
- **Pros & Cons (+/-)**
- **Recommendations & Solutions**

At the very end of the report, append this exact Scoring Table template:

```markdown
## Overall Scoring & Evaluation

| Category | Score (1-10) | Completion (%) | Critical Note |
|---|---|---|---|
| Architecture & Design | -/10 | %- | [Summary note] |
| Performance | -/10 | %- | [Summary note] |
| Clean Code & Tech Debt | -/10 | %- | [Summary note] |
| Security & QA | -/10 | %- | [Summary note] |
| UX & Features | -/10 | %- | [Summary note] |
| **GRAND TOTAL** | **-/10** | **%-** | **[Summary note]** |
```

### Report Guidelines
- Do not paste large code blocks; describe findings semantically.
- Be objective and specific. Provide file paths and line ranges for findings.
- The document must be written in **English** (to ensure universal compatibility), unless the user's specific context or system rules override this (e.g. forced Turkish mode).

---

## ProMem Synclink (Mandatory)

Once the analysis is complete:

1. Create the `.pm/05_Resources/Analysis/` directory if it does not exist.
2. Run `pm update` (or `node pm.js update`) to refresh the auto-generated Directory Structure / Key Files sections of `Architecture.md` and `Anatomy.md`. Then manually note the new report's location under the Anatomy Key Files or Module Map section.
3. Update `.pm/04_Execution/Cerebrum.md` (Key Learnings / Rules) with any architectural constraints or design patterns discovered.
4. Update `.pm/04_Execution/Buglog.md` with any high or medium severity issues found, assigning them issue IDs (e.g. `OPT-001`).
5. Append a transaction log to `.pm/04_Execution/Memory.md` by calling the CLI:
   `pm memory "Performed 5-pillar codebase audit and generated analysis report under .pm/05_Resources/Analysis/." -a <Your_Name>`
