# 8. Browser Permissions

Permissions are a **security and trust surface** shown to users — they must
be treated conservatively.

- **Never add a permission speculatively** "in case it's needed later."
  Add a permission only when a concrete, current feature requires it.
- Every new permission added to `manifest.json` must be **justified in the
  PR/commit description** with the specific feature that needs it.
- Before requesting a permission, **check whether a less-privileged API or
  pattern exists** (e.g. `activeTab` instead of persistent `<all_urls>` host
  permission; `chrome.storage.session` instead of broader access patterns).
  For this notes extension, `activeTab` is sufficient to read the active
  tab's URL and title — do not request `host_permissions` merely to
  associate notes with sites.
- **Avoid broad host permissions** (`*://*/*`, `<all_urls>`) unless the
  feature is fundamentally incompatible with a narrower scope. Prefer
  `activeTab`, optional permissions requested at runtime
  (`chrome.permissions.request`), or scoped host patterns.
- Prefer **optional permissions** (declared in `optional_permissions`) for
  features not needed at install time, requested only when the user invokes
  that feature.
- Document the purpose of each permission in the project's documentation
  so reviewers can audit the permission set at a glance.