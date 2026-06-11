---
name: requesting-plan-review
description: >-
  Dispatch the planner subagent to create or review implementation plans before
  coding. Use when starting a multi-step feature, after brainstorming, when
  requirements exist but no plan does, or before implementing an existing plan.
---

# Requesting Plan Review

Dispatch the **planner** subagent to produce or validate an implementation plan before any code is written. The planner gets precisely crafted context — requirements, constraints, and codebase scope — not your full session history. This keeps planning focused and preserves your context for implementation.

**Core principle:** Plan before you code. Review the plan before you start.

## When to Request Planning

**Mandatory:**
- Before starting any multi-step feature or refactor
- After brainstorming, when requirements are decided but tasks are not
- Before implementing from an existing plan document

**Optional but valuable:**
- When scope feels unclear or too large
- Before risky changes (migrations, auth, payments)
- When resuming work after a break (re-validate the plan)

## How to Request

**1. Gather inputs:**

- Requirements or spec (user message, issue, brainstorming notes)
- Existing plan path (if reviewing, not creating)
- Constraints (deadline, tech choices, out-of-scope items)

**2. Dispatch planner subagent:**

Use the Task tool with `subagent_type: "planner"`, or ask the agent to use the planner subagent. Fill the template at [planner.md](planner.md).

**Placeholders:**
- `{FEATURE_OR_GOAL}` — What to build or change
- `{REQUIREMENTS}` — Spec, acceptance criteria, or user constraints
- `{EXISTING_PLAN}` — Path to plan file if reviewing; "none" if creating new
- `{CODEBASE_CONTEXT}` — Relevant files, patterns, or areas to explore
- `{DESCRIPTION}` — Brief summary of the planning request

**3. Act on the verdict:**
- **Yes** — Save plan to `docs/plans/`, begin Task 1
- **Yes with changes** — Apply planner feedback, re-dispatch if needed, then implement
- **No — blocked** — Resolve open questions with the user before coding

**4. After implementation** — Use `requesting-code-review` (or code-reviewer subagent) to validate work against this plan.

## Example

```
[User wants a blog comment system]

You: Let me request a plan before we write code.

[Dispatch planner subagent]
  FEATURE_OR_GOAL: Add comment system to the blog
  REQUIREMENTS: Users can post comments on posts; admin can delete; no auth required yet
  EXISTING_PLAN: none
  CODEBASE_CONTEXT: index.html static blog; check .cursor/agents/ and project structure
  DESCRIPTION: Plan comment feature with minimal JS and local storage or simple backend

[Subagent returns]:
  Verdict: Yes with changes
  Open Questions: Persist comments in localStorage or add a backend?
  Plan: docs/plans/2026-06-11-comment-system.md with 4 tasks

You: [Confirm localStorage approach with user]
[Save plan, start Task 1]
[After Task 1 completes → dispatch code-reviewer against Task 1 section]
```

## Integration with Workflows

**New feature:**
1. Brainstorm / gather requirements
2. **Planner** → implementation plan
3. Implement task-by-task
4. **Code-reviewer** after each task (or batch)

**Existing plan:**
1. **Planner** reviews plan for gaps
2. Implement only after **Ready to implement: Yes**

**Ad-hoc fix:**
- Skip planner for single-file one-line fixes
- Use planner when the fix touches 2+ files or unclear scope

## Red Flags

**Never:**
- Start multi-step work without a plan
- Ignore **No — blocked** verdicts
- Implement while open questions remain unresolved
- Skip code-reviewer after planned tasks complete

**If planner is wrong:**
- Push back with codebase evidence (file paths, existing patterns)
- Ask planner to revise the plan, not to code

See dispatch template at: [planner.md](planner.md)
