# 15. Error Handling

- **Errors must never be silently ignored.** Every `catch` block must either
  handle the error meaningfully, rethrow, or explicitly log with context —
  never an empty `catch {}`.
- Handle **Chrome API failures** explicitly: check `chrome.runtime.lastError`
  after callback-based APIs, and wrap Promise-based Chrome APIs in
  `try/catch`.
- Handle **permission failures** (denied/missing permission, restricted pages
  whose URL/title cannot be read for note association) with a specific,
  recognizable error path distinct from generic failures.
- Handle **invalid input** (malformed messages, unexpected data shapes) by
  validating and rejecting early with a clear reason, rather than letting
  invalid data propagate.
- Handle **unexpected states** defensively (e.g. the tab closed or navigated
  away before its URL could be read, service worker restarted mid-save)
  rather than assuming the happy path always holds.
- **User-facing error messages** must be understandable and actionable
  (e.g. "This page can't be associated with a note because it's a Chrome
  system page," not "Error: undefined is not a function").
- **Developer-facing errors** (console/log output) should include enough
  context (operation, relevant IDs, original error) to diagnose the issue
  without exposing sensitive data.
- Network errors (if/when any remote calls are introduced) must be handled
  with the same rigor: timeouts, retries where appropriate, and clear
  failure states.