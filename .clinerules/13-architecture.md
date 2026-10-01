# 13. Architecture

- Apply **separation of concerns**: keep UI code, Chrome API/browser
  integration code, and pure business/data logic in distinct modules.
- Apply the **Single Responsibility Principle** at the module/function
  level — each module should have one clear reason to change.
- Keep the codebase **modular**: small, composable files/functions over
  large monolithic ones.
- Respect the **boundaries between extension contexts** (service worker,
  content script, popup, options page) — communicate only through explicit
  messaging, never by assuming shared memory (see
  [Chrome Extension Best Practices](./06-chrome-extension-best-practices.md)).
- Favor **reusable, small functions/modules** over copy-pasted logic, but
  only extract shared code once genuine duplication exists — not
  speculatively.
- **Avoid circular dependencies** between modules; structure imports in a
  clear, directional (typically layered) fashion.
- **Avoid global mutable state.** Persist cross-context/cross-restart state
  via `chrome.storage`, and keep in-memory state local to the function/
  module that owns it.
- **Avoid unnecessary abstractions.** Do not introduce interfaces, base
  classes, or plugin systems for a single concrete implementation.
- **Avoid over-engineering.** Explicitly discourage creating layers such as
  "repositories," "factories," "managers," "services," or "adapters" purely
  by convention — introduce such a layer only when it removes real,
  demonstrated duplication or complexity, not preemptively.
- Keep the **architecture proportional to the project's actual complexity**
  at any given time; re-evaluate and evolve it as the product grows, rather
  than designing for hypothetical future scale up front.