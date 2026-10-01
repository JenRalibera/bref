# 4. JavaScript Best Practices

- Target **modern ECMAScript** (the latest stable version supported by
  current Chrome, since the extension only needs to run in Chrome — no need
  to transpile for legacy browser support).
- Always use **`const`** by default; use **`let`** only when a binding must
  be reassigned. **Never use `var`.**
- Organize code as **ES modules** (`import`/`export`) rather than relying on
  global scripts and implicit globals, wherever the execution context
  supports it (service worker as ES module, popup/options scripts, content
  scripts via bundling if a build step is introduced).
- Keep **functions small and single-purpose**. A function should do one
  thing and be named after what it does.
- Keep **code short**: avoid overly long functions and files. As a rough
  guideline, a function should rarely exceed ~50 lines and a file should
  rarely exceed ~200 lines — when they grow beyond that, split them into
  smaller, single-purpose pieces. Long code is harder to read, review, and
  test.
- Use clear, intention-revealing **naming conventions**:
  `camelCase` for variables/functions, `PascalCase` for classes/constructors,
  `UPPER_SNAKE_CASE` for true constants, verbs for functions
  (`saveNote`), nouns for values (`noteList`).
- Respect **scope**: declare variables in the narrowest scope needed. Avoid
  leaking variables into outer/global scope.
- **Avoid global variables.** Extension contexts (service worker, content
  script, popup) do not share JS globals/state — do not design around
  shared mutable globals (see [Chrome Extension Best Practices](./06-chrome-extension-best-practices.md)).
- Prefer **immutability**: don't mutate function parameters or shared
  objects in place; return new values/objects when practical
  (`Array.map`/`filter`/`reduce`, object spread) instead of mutating.
- Use **`async`/`await`** for asynchronous code instead of raw `.then()`
  chains, for readability. Always handle rejections with `try/catch` (or
  `.catch`) — **never leave a floating unhandled promise**.
- Wrap Chrome API calls and other fallible operations in explicit error
  handling; check `chrome.runtime.lastError` where the callback-style API is
  used, and surface/log failures meaningfully (see [Error Handling](./15-error-handling.md)).
- Use **event delegation and cleanup**: remove listeners when a
  component/context is torn down (e.g. popup closing) to avoid leaks, and
  avoid attaching duplicate listeners.
- Prefer **direct, minimal DOM manipulation**. Batch DOM reads/writes when
  performance matters; avoid unnecessary reflows. Do not introduce a
  templating/rendering library for simple static UI.
- **Avoid magic numbers and strings.** Extract them into named constants
  (e.g. `MAX_NOTE_LENGTH`, `MESSAGE_TYPE.NOTE_SAVE_REQUEST`).
- **Avoid deeply nested logic** (nested `if`/`for` beyond 2–3 levels). Use
  early returns/guard clauses and extract helper functions instead.
- Apply **separation of concerns**: keep DOM/UI code, Chrome API calls, and
  pure business logic in distinct modules/functions so each can be reasoned
  about (and tested) independently.
- Prefer **pure functions** for data transformations (no side effects, same
  input → same output) so they are trivially unit-testable.
- Prioritize **readability and maintainability** over cleverness — code is
  read far more often than it is written.
- **Never use `eval`, `new Function`, or other dynamic code execution.**
  Never use `with`. Never use `document.write`. Always use strict equality
  (`===`/`!==`). Do not rely on implicit type coercion.