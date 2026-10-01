# 7. Security

Security is a **first-class requirement**, not an afterthought.

- Apply the **Principle of Least Privilege** everywhere: permissions, host
  access, message handling, and stored data scope.
- The extension's **Content Security Policy** (as enforced by Manifest V3)
  must not be weakened. Do not add `unsafe-eval` or remote script sources.
- **Never use `eval`, `new Function`, `setTimeout`/`setInterval` with a
  string argument, or any other dynamic code execution.**
- **No remotely hosted executable code.** All JavaScript must be bundled
  inside the extension package, per Chrome Web Store policy and MV3
  constraints.
- **Avoid `innerHTML`/`outerHTML`/`insertAdjacentHTML` with dynamic or
  untrusted content.** Prefer `textContent`, `createElement`, and DOM APIs.
  If HTML must be injected, sanitize it first and justify why a template
  string approach was necessary.
- **Validate all inputs**: user-provided form input, data read from
  `chrome.storage`, and especially any data coming from content scripts or
  web pages must be validated/sanitized before use.
- **Validate all inter-context messages.** Never trust a message's shape or
  origin blindly: check `sender` (e.g. `sender.id === chrome.runtime.id`),
  validate the message `type` against a known set, and validate payload
  shape before acting on it.
- Content scripts must treat the **host page as untrusted**. Do not read
  page-defined globals or execute page-provided functions.
- **Never commit secrets** (API keys, tokens, credentials) to source control.
  If a remote service is ever integrated, use environment-based
  configuration and document handling separately (not committed).
- **Note content and website data** are private user data and must be handled
  carefully:
  - Do not transmit note content off-device unless the feature explicitly
    requires and discloses it.
  - Persist notes locally in `chrome.storage`; never expose note content to
    host pages or third parties (no `postMessage` to the page, no remote
    endpoints by default).
  - Treat page URLs/titles read from web pages as untrusted input: normalize,
    validate, and sanitize them before storing or displaying.
  - Do not log note content or embed it in logs/analytics.
- Secure inter-context communication: use `chrome.runtime`/`chrome.tabs`
  messaging APIs (not `postMessage` to the page) for extension-internal
  communication so messages stay within the extension's trust boundary.
- Any dependency (see [Dependencies](./12-dependencies.md)) must be vetted for
  known vulnerabilities before being introduced.