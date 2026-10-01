# 16. Logging

- Use logging to aid **development and diagnostics**, not as a substitute
  for proper error handling.
- **Development logging** may be more verbose (state transitions, API
  responses) but must still avoid dumping raw note bodies or entire storage
  payloads to the console.
- **Production logging** must be minimal: log actionable errors/warnings,
  not routine successful operations.
- **Never log sensitive information**: note content, user data, tokens/keys,
  or full message payloads that may contain user data.
- **Avoid excessive/noisy logs** that make real issues hard to find; remove
  temporary `console.log` debugging statements before considering a change
  complete.
- Log messages should include **useful context** (which module/operation
  failed, relevant identifiers) rather than bare error text.
- For debugging the **service worker**, rely on the dedicated DevTools
  console available from `chrome://extensions` (see
  [Chrome Extension Best Practices](./06-chrome-extension-best-practices.md))
  rather than adding permanent verbose logging.