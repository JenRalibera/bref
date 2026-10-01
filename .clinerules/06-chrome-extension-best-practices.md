# 6. Chrome Extension Best Practices

The extension **must target Manifest V3**. Manifest V2 patterns (background
pages, blocking `webRequest`, remotely hosted code) are not permitted.

### Manifest structure
- Keep `manifest.json` minimal and explicit: only declare the permissions,
  scripts, and entries actually used (see [Browser Permissions](./08-browser-permissions.md)).
- Use the `action` key for the toolbar popup (MV3), not the deprecated
  `browser_action`/`page_action`.

### Execution contexts
The extension is composed of **isolated execution contexts** that do **not**
share JS memory/state. The AI must never assume a variable or in-memory
object set in one context is visible in another. The contexts are:

| Context | Lifetime | Notes |
|---|---|---|
| Service worker (background) | Event-driven, can be terminated/restarted at any time by Chrome | No persistent in-memory state — persist via `chrome.storage` instead |
| Content script | Lives as long as the tab/frame it's injected into | Runs in an isolated JS world alongside the page; shares the DOM but not JS globals with the page |
| Popup | Lives only while the popup is open | Destroyed when the popup closes — do not rely on popup state surviving a close |
| Options / extension pages | Regular page lifetime | Behaves like a normal web page context, still without direct access to other contexts' memory |

- **Cross-context communication** must go through explicit, documented
  message passing (`chrome.runtime.sendMessage` /
  `chrome.tabs.sendMessage` / `chrome.runtime.onMessage`, or long-lived
  `Port` connections for streaming/repeated exchanges). Define a small, typed
  (or documented) set of message shapes/types rather than ad-hoc objects.
- Any state that must survive across contexts or service worker restarts
  must be persisted via `chrome.storage` (`local` or `session` as
  appropriate) — never assume in-memory persistence in the service worker.
  Notes are the extension's core data: store them in `chrome.storage.local`
  keyed by a canonical, normalized page URL, and route all note
  read/write operations through the service worker so popup/options pages
  never hit storage directly.
- The **service worker has no DOM**. Do not use `document`, `window`, or DOM
  APIs there. Use `fetch`, `OffscreenCanvas`, or the `offscreen` document API
  when DOM/canvas access is required from a background context.
- **Content scripts** must not assume the host page's JavaScript environment
  is safe/trustworthy. Do not directly execute page-provided code.

### Permissions & APIs
- Request the **minimum permissions** required (see
  [Browser Permissions](./08-browser-permissions.md)).
- Prefer `activeTab` + user-gesture-triggered actions over broad persistent
  host permissions when the feature (e.g. reading the active tab's URL and
  title to associate a note) allows it.
- Use official Chrome extension APIs (`chrome.tabs`, `chrome.storage`,
  `chrome.action`, etc.) rather than reimplementing browser behavior.

### Lifecycle & restrictions
- The **service worker can be terminated at any time** after a short idle
  period — do not write code that assumes it stays alive between unrelated
  events. Structure work as short, event-driven handlers.
- Certain pages **cannot be accessed or scripted** by extensions:
  `chrome://*`, the Chrome Web Store, other extensions' pages, and (unless
  explicitly supported) `file://` URLs without extra permission. Always
  handle and communicate this gracefully.
- Handle **install/update/uninstall lifecycle events**
  (`chrome.runtime.onInstalled`) deliberately when initialization or
  migration logic is needed.

### Debugging & testing
- Use **Chrome DevTools** for each context independently: `chrome://extensions`
  → "service worker" link for the background context, right-click → Inspect
  for the popup, and regular DevTools for content scripts (inside the page's
  DevTools, "Sources" → Content scripts).
- Use `chrome://extensions` in Developer Mode to load unpacked, reload, and
  inspect errors during development.
- Manual testing in an actual Chrome instance is required in addition to any
  automated tests, because much of the platform behavior cannot be fully simulated