# 9. Notes Extension Best Practices

Associating notes with websites (by URL) is the extension's core feature and
must be implemented with an explicit understanding of how URLs work and how
Chrome exposes them.

- **Understand URL identity.** Different strings can point to the same page
  (with/without fragment, trailing slash, `www`, default port, `http` vs
  `https`). Define and document a **URL normalization** strategy (strip
  fragment, drop default ports, lowercase scheme/host) before keying notes
  by URL, and apply it consistently when storing and matching notes — never
  match against raw strings or ad-hoc heuristics that could split or merge
  notes for the same site.
- **Do not assume every page can be annotated.** Chrome restricts access to
  internal pages (`chrome://*`, Web Store, other extensions' pages) and may
  restrict certain `file://` contexts. Detect these cases and communicate
  them with a clear user-facing message — never fail silently.
- **Read the current site's URL/title via `chrome.tabs`** (using `activeTab`
  granted by the user's click) and treat both as untrusted data that must be
  validated before storing or rendering.
- **Distinguish "no note" from "note exists" as deliberate UI states.** The
  empty state invites the user to create a note for the current site; the
  filled state offers read/edit/delete with explicit save feedback.
- **Keep the note model deliberate.** A note needs at minimum a stable id,
  the normalized URL it belongs to, its content, and `createdAt`/`updatedAt`
  timestamps. Persist it in `chrome.storage.local` and document its shape
  (see [TypeScript](./05-typescript.md) for a typed model).
- **Handle write failures explicitly** (storage quota exceeded, context
  closed, service worker restarted mid-save) with actionable feedback —
  never silently lose note content.
- **Never destroy user content.** Destructive actions (deleting a note,
  overwriting with empty content) require explicit confirmation or an undo
  path.
- **Always provide user feedback**: loading state while fetching the current
  site's note, save-in-progress/saved confirmation, and clear error states.
- Keep operations efficient: when the popup opens, fetch only the note for
  the current URL rather than the whole collection, and reuse cached reads
  within a session where safe.
