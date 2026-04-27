# Examples

## Example: ambiguous feature request

User: “Add caching to this endpoint.”

Apply:
- **Assumptions**: What scale/traffic? What cache key? Is staleness allowed?
- **Tradeoffs**: in-memory vs Redis vs CDN; TTL vs explicit invalidation.
- **Simplicity**: pick the smallest viable cache that meets requirements; avoid building a generic cache framework.
- **Success criteria**: a benchmark or test verifying cache hit behavior and acceptable correctness/staleness.

## Example: surgical change in existing code

User: “Fix the bug where exam results sometimes show as blank.”

Apply:
- Write a reproduction (test, fixture, or steps).
- Make the smallest fix that addresses the root cause.
- Avoid formatting/refactoring unrelated files while touching the hot path.
- Verify with the reproduction + existing test suite.

## Example: refactor request

User: “Refactor this module to be cleaner.”

Apply:
- Ask for target outcomes (readability? performance? testability? fewer bugs?).
- Define success criteria (tests passing, smaller public API, reduced cyclomatic complexity).
- Do it in small, verifiable steps; keep diffs localized.
