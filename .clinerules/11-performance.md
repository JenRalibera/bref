# 11. Performance

Performance rules should keep the extension lightweight and responsive
without pursuing optimization for its own sake.

- Keep **bundle size** minimal: avoid unnecessary dependencies and dead
  code; ship only what each context (service worker/popup/content script)
  actually needs.
- Minimize **DOM manipulation**: batch reads/writes, avoid layout thrashing,
  and avoid re-rendering unaffected parts of the UI.
- Add and **remove event listeners** deliberately; never leave orphaned
  listeners attached to detached DOM nodes or closed contexts.
- Be deliberate about **memory usage**: avoid pulling the entire note
  collection into the DOM; render only the notes/summaries actually visible
  (e.g. in the options page), and drop references to rendered lists when
  views close.
- Keep the **service worker efficient**: handle events quickly, avoid
  long-running synchronous work, and do not depend on it staying resident.
- **Avoid unnecessary polling.** Prefer event-driven APIs
  (`chrome.tabs.onUpdated`/`chrome.tabs.onActivated` to react to tab changes,
  `chrome.storage.onChanged` to refresh the UI when notes change, message
  passing, alarms for scheduled work) over `setInterval` loops checking
  state repeatedly.
- **Avoid unnecessary background work.** The service worker should do work
  only in response to a real trigger (user action, browser event), not
  continuously.
- **Do not optimize prematurely.** Write clear, correct code first; only
  optimize a specific, measured bottleneck, and document why when you do.