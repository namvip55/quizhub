---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes (simplicity, surgical edits, explicit assumptions, verifiable success criteria). Use when writing, reviewing, debugging, or refactoring code; especially for multi-step changes, ambiguous requirements, or when scope creep/overengineering is likely.
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from Andrej Karpathy's observations on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Operating principles

- Prefer **minimum code** that solves the request.
- Prefer **local, surgical diffs** over broad refactors.
- Prefer **explicit assumptions and tradeoffs** over silent choices.
- Prefer **verifiable success criteria** over vague intent.

## 1) Think before coding

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2) Simplicity first

- No features beyond what was asked.
- No abstractions for single-use code.
- No “flexibility” or “configurability” unless requested.
- No error handling for impossible scenarios.
- If you wrote 200 lines and it could be 50, rewrite it.

Ask yourself: “Would a senior engineer say this is overcomplicated?” If yes, simplify.

## 3) Surgical changes

When editing existing code:
- Touch only what you must to satisfy the request.
- Don't “improve” adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4) Goal-driven execution

Transform tasks into verifiable goals and loop until verified.

Examples:
- “Add validation” → write tests for invalid inputs, then make them pass.
- “Fix the bug” → write a test that reproduces it, then make it pass.
- “Refactor X” → ensure tests pass before and after.

For multi-step tasks, state a brief plan using this format:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## Additional resources

- Concrete application examples: see [examples.md](examples.md)
