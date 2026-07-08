---
name: pm-brainstorm
description: >
  Interactive collaborative brainstorming aligned with the ProMem framework.
  Explores requirements, refines design concepts, and updates ProMem
  Foundations (Brief), Planning (Backlog), and Specifications (ADR/Architecture)
  layers on user approval.
---

# pm-brainstorm — ProMem Brainstorming Skill

This skill governs interactive, step-by-step brainstorming sessions that feed
directly into the ProMem 5-layer directory structure.

---

## Process Checklist

You must create a task for each item and complete them in order:

1. **Explore ProMem Context:** Read `.pm/01_Foundations/Brief.md`,
   `.pm/03_Specifications/Architecture.md`, and `.pm/04_Execution/Cerebrum.md`
   to understand current project constraints and rules.
2. **Assess Scope:** Before asking detailed questions, check whether the
   request actually describes multiple independent subsystems (e.g., "add
   auth, a notifications service, and a billing dashboard"). If so, say so
   immediately and help the user decompose it into separate sub-projects —
   each gets its own pass through this checklist, its own Backlog entry, and
   its own ADR if warranted. Don't spend questions refining details of a
   project that needs to be split first.
3. **Clarify the Idea:** Ask clarifying questions **one at a time**.
   Explore constraints, goals, and success criteria.
4. **Propose Approaches:** Offer 2-3 technical approaches with trade-offs,
   highlighting your recommended solution.
5. **Self-Review the Draft:** Before presenting anything to the user, look at
   your own draft design with fresh eyes:
   - **Placeholder scan:** any "TBD", vague requirement, or unresolved gap? Fix it.
   - **Internal consistency:** does anything in the design contradict the
     constraints found in step 1 (Cerebrum rules, existing Architecture)?
   - **Scope check:** does this still match the boundary agreed on in step 2,
     or has it grown into something that needs decomposition after all?
   - **Ambiguity check:** could any requirement be read two different ways?
     Pick one interpretation and make it explicit in the draft.
   Fix issues inline — no need to re-run the checklist, just fix and move on.
6. **Draft the Design:** Present the chosen design sections to the user
   for review and approval.
7. **Update ProMem Layers:**
   - Append/modify features in `.pm/01_Foundations/Brief.md` under **Scope**.
   - Add new backlog tasks to `.pm/02_Planning/Backlog.md` with priority tags (🔴 P0, 🟠 P1, etc.).
   - Create a new Architectural Decision Record (ADR) in `.pm/04_Execution/ADR.md` if architectural changes were decided.
   - Update `.pm/03_Specifications/Architecture.md` if the tech stack or folder layout changes.
8. **Log to Memory:** Append a handoff entry to `.pm/04_Execution/Memory.md`
   logging the completed brainstorm session.

---

## Guidelines for Dialogue

- **One question at a time.** Never ask multiple questions in a single response.
- **Multiple choice where possible.** Make it easy for the user to select options.
- **Respect Cerebrum rules.** If the user proposes an approach that violates
   a rule in `.pm/04_Execution/Cerebrum.md`, flag it immediately.
- **Do not write code.** No scaffolding or implementation actions can be taken
   during the brainstorming phase.

---

## Rules

1. **Never write implementation files** (e.g. `src/`) during a brainstorm.
2. **Always get explicit user approval** on the final design before updating
   the ProMem files.
3. **Log the session.** Always write the summary entry to `Memory.md` at the
   end of the session so the next agent knows what was decided.
