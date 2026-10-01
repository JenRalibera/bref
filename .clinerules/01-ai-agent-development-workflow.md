# 1. AI Agent Development Workflow

The AI agent must follow a disciplined workflow for every task, no matter how
small it appears.

1. **Understand the requirement first.** Restate the goal, identify what
   problem is being solved, and identify acceptance criteria before writing
   any code.
2. **Inspect the existing codebase before acting.** Read relevant files,
   manifest, configuration, and related modules. Never assume structure —
   verify it.
3. **Identify impacted files and contexts.** Explicitly determine which
   extension context(s) are affected (service worker, content script, popup,
   options page, extension page) and which files must change.
4. **Plan before implementing.** Produce a short plan (files to touch,
   approach, risks) before writing code, especially for anything beyond a
   trivial one-line fix.
5. **Ask for clarification when requirements are ambiguous.** Do not guess
   product behavior, permission scope, or UX details that materially change
   the outcome. Ask a specific, answerable question instead of assuming.
6. **Make minimal, focused changes.** Touch only what is necessary to fulfil
   the task. Do not refactor unrelated code "while you're in there" unless
   explicitly asked.
7. **Avoid unrelated modifications.** No drive-by renames, reformatting of
   untouched files, or dependency bumps unless part of the task.
8. **Implement incrementally.** Prefer small, verifiable steps over one large
   change. Each step should be independently reviewable and, where possible,
   independently testable.
9. **Test changes.** Run existing tests, add tests for new behavior, and
   manually validate in the browser when the change affects extension
   behavior that cannot be unit tested.
10. **Review changes before considering them complete.** Re-read the diff,
    check for leftover debug code, unused imports, and confirm the change
    matches the stated requirement.
11. **Update documentation when necessary.** If behavior, setup steps,
    permissions, or architecture change, update the relevant documentation in
    the same change.

The AI must never blindly generate large amounts of code without first
understanding the existing project state, and must never present unverified
work as complete or tested.