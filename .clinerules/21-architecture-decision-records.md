# 21. Architecture Decision Records

Significant architectural decisions (technology stack, storage schema, URL
normalization strategy, message protocol, feature design) must be recorded
here as short, dated ADRs. A decision needs an ADR when it is hard to
reverse, has security/privacy implications, or changes how other parts of
the project work (including any "significant/major dependency" per
[Dependencies](./12-dependencies.md)).

Suggested records for this notes extension:
- Storage model for notes in `chrome.storage.local` (keyed by normalized URL)
- URL normalization strategy and matching rules
- Message types/protocol between popup/options and the service worker
- Technology stack (language, build tooling, dependencies) once chosen

Template for a new ADR:

```markdown
## ADR-XXX — <Title>

- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded

### Context
What problem or constraint motivated the decision?

### Decision
What was decided?

### Consequences
What trade-offs, costs, and follow-ups does this create?
```

## ADR-001 — Initial stack: vanilla JavaScript, no build step

- Date: 2026-09-24
- Status: Accepted

### Context
The repository starts from an empty state (feature 01: make the extension
reachable from the browser and open its popup interface). No framework, build
tool, or language has been chosen yet. Feature 01 needs no application logic
and no browser permissions; introducing tooling now would be premature.

### Decision
- Use **modern, native JavaScript (ES modules)** for now — no TypeScript, no
  build step, no framework, no third-party dependency (rules 05, 12).
- Structure the project by extension context (`popup/`, `service-worker/`,
  `content-scripts/`, `shared/`), adding directories only when a feature
  needs them (rule 14).
- The popup is static semantic HTML + CSS for feature 01; it ships **no**
  JavaScript until an interaction or data requirement exists (rules 02, 04).
- Manifest V3 with **zero permissions** for now. The minimum permission
  (`activeTab`) is added, justified, only when note-to-URL association is
  implemented (rules 06, 08).

### Consequences
- Loading unpacked in Chrome stays a direct, build-free flow.
- A later switch to TypeScript stays cheap (current files are static
  HTML/CSS); per rule 05 any TypeScript adoption must be project-wide and
  recorded in a dedicated ADR.
- Permissions grow one at a time, each justified in its commit/PR.

## ADR-002 — Activation state: `chrome.storage.local`, UI gating, no service worker

- Date: 2026-09-28
- Status: Accepted

### Context
Feature 02 ("activer/désactiver l'extension") requires a user-controllable
on/off flag that persists, a visible state, note actions unavailable while the
extension is off, and notes preserved across deactivation. The repository still
has **no notes feature** (no note model, no `activeTab` access to the current
tab) and **no service worker**; ADR-001 shipped zero permissions and no popup
JavaScript.

### Decision
- **Storage**: the flag lives in `chrome.storage.local` under the single
  boolean key `activationEnabled`. It must be persisted (not in-memory) because
  the popup is destroyed when it closes and no context shares memory (rule 06).
  Deactivation writes **only** that key — `chrome.storage.local.clear()` is
  never called — so notes (future) are preserved (AC5).
- **Permission**: add `storage` only. No host permission and no `activeTab`
  yet, as reading the current tab's URL is a notes-feature concern (rule 08).
  The permission is justified in the commit/PR and documented in the README.
- **Ownership**: the popup reads/writes the flag directly through the shared
  module `shared/activation-state.js`. **No service worker is introduced at
  this stage** — a background context would only proxy a single boolean
  (rules 12/13: no speculative abstraction). When notes are implemented, note
  reads/writes will be routed through the service worker (rules 06/09), which
  will also re-check the activation flag: UI gating is not a security boundary
  (rule 07).
- **Gating UI**: the three note actions are grouped in
  `<fieldset id="notes-actions" disabled>`, which natively removes them from
  keyboard and pointer access; the script toggles the `disabled` attribute from
  the activation state. The markup ships disabled (safe by default) and only a
  successfully read `true` state enables the group.
- **Control & state visibility**: a native `<input type="checkbox">` with an
  explicit `<label>` (no ARIA needed) plus a `role="status"` line that
  announces "Activée/Désactivée" (AC7). `chrome.storage.onChanged` keeps the UI
  in sync without polling (rule 11).
- **Default**: `DEFAULT_ACTIVATION_ENABLED = true` — the user installs the
  extension to use it, so deactivation is an explicit gesture. Changing the
  default is a one-constant change (`shared/activation-state.js`).
- **Scope**: the note-action buttons are UI-only (no click handlers). They are
  made available/inaccessible by the activation state; their behavior arrives
  with the notes feature. A hint in the group says so, to avoid a misleading
  enabled-but-inert control.

### Consequences
- The popup now ships JavaScript (`popup/popup.js`, ES module, no build step),
  superseding ADR-001's "no JS in the popup" for feature 02.
- Storage failures (quota, invalid stored value) are surfaced to the user and
  fall back to the least-permissive state (deactivated) instead of silently
  failing.
- AC5/AC6 are guaranteed by construction (no destructive write, notes area
  always rendered outside the disabled group) but not yet demonstrable on
  screen, since no note can be created yet.
- When the notes feature lands, an ADR must define the notes storage model
  (keyed by normalized URL) and the popup ⇄ service worker message protocol.

## ADR-003 — Viewing notes: storage model, URL normalization, popup ⇄ service worker protocol

- Date: 2026-09-28
- Status: Accepted

### Context
Feature 03 ("consulter les notes associées au site visité") is the first
feature that needs real note data: the extension must know which site the user
is on, store notes per site, and display only that site's notes. ADR-002
deferred two decisions to this moment: the notes storage model (keyed by a
normalized URL) and the popup ⇄ service worker message protocol. Rule 06 also
requires note reads/writes to be routed through the service worker.

### Decision
- **Permission**: add `activeTab` only. It is granted when the user invokes the
  action (which opens the popup), grants temporary access to the active tab's
  URL/title, and expires on navigation (rule 08). No host permission, no `tabs`
  permission (which would expose every tab's URL).
- **Service worker introduced**: `service-worker/service-worker.js` (ES module)
  is the **only** reader of note storage. It validates the sender
  (`sender.id === chrome.runtime.id`), the message type (known set) and the
  payload shape, then normalizes the URL, reads, and answers.
- **Protocol** (`shared/notes-messages.js`): `VIEW_NOTES_REQUEST { url }` →
  `VIEW_NOTES_RESULT { ok: true, siteUrl, notes }` or `{ ok: false, reason }`
  with reasons `INVALID_REQUEST`, `UNSUPPORTED_PAGE`, `READ_FAILED`. The popup
  validates the answer shape before rendering it.
- **Storage model**: one key per site — `notes:<normalizedUrl>` → array of
  notes — so opening the popup reads exactly one key and never the whole
  collection (rule 09). A note is
  `{ id, url, content, createdAt, updatedAt }` (`shared/note.js`). Entries that
  do not match that shape are ignored (and warned) when read: they stay in
  storage, they are simply not displayed (rules 07/15).
- **URL normalization** (`shared/url.js`): only `http:`/`https:` pages can carry
  notes; the fragment is stripped, the query string is kept; lowercase
  scheme/host and default-port removal come from the `URL` parser. `www.` is
  **not** merged with the bare host: merging could attribute a note to the
  wrong site, so the conservative choice is kept and documented.
- **Activation flag**: viewing is deliberately **not** gated by the activation
  state (AC5). The flag will be checked inside the service worker for
  create/update/delete operations, which must not be reachable by the UI alone
  (rule 07). The `<fieldset disabled>` gating of ADR-002 remains a UX control.
- **UI**: `popup/notes-section.js` resolves the active tab's URL, requests the
  notes, and renders loading / empty / unsupported-page / error / list states.
  Note content is inserted with `textContent` only, note bodies keep their line
  breaks (`white-space: pre-wrap`), and a `role="status"` line announces the
  outcome (rule 10). The static empty state of feature 01 is replaced by that
  message.
- **Split of the popup**: `popup.js` becomes an entry point; the section logic
  lives in `activation-section.js` and `notes-section.js`, and the rendering of
  a single note in `note-item.js`, so no file drifts past the size guideline of
  rule 04.

### Consequences
- The popup no longer touches note storage at all: every note read goes through
  messaging (rule 06), and the service worker is now part of the extension's
  runtime (it can be terminated at any time, so it holds no state).
- Manual validation currently requires seeding `chrome.storage.local` with
  `notes:<url>` entries, because no create-note UI exists yet (see
  `tasks/00-tasks-status.md`).
- URL normalization is now a fixed contract: the future create/update features
  must reuse `normalizeUrl` or notes will be split across keys.
- Known limitation: the popup resolves the site when it opens; it does not
  refresh if the URL changes while it stays open (SPA navigation).

## ADR-004 — Cross-browser background entry: `service_worker` + `scripts`

- Date: 2026-09-28
- Status: Accepted

### Context
ADR-003 introduced the extension's first background context as a Manifest V3
service worker (`background.service_worker`, `type: "module"`). Loading that
manifest in Firefox fails with "background.service_worker is currently disabled.
Add background.scripts.": Firefox does not implement MV3 background service
workers (bug 1573659) and uses a non-persistent event page declared with
`background.scripts`. The project has no build step (ADR-001), so shipping a
browser-specific manifest is not an option.

### Decision
- Declare **both** background keys in the single manifest, the pattern
  documented by MDN for cross-browser MV3 extensions:

  ```json
  "background": {
    "scripts": ["service-worker/service-worker.js"],
    "service_worker": "service-worker/service-worker.js",
    "type": "module"
  }
  ```

- Behaviour per browser (MDN, `manifest.json/background`): Chrome from version
  121 **ignores** `background.scripts` in MV3 and starts the service worker
  (before 121 Chrome refused such a manifest); Firefox from version 121 starts
  the event page from `scripts` even when `service_worker` is present (before
  121, the presence of `service_worker` prevented it from starting); Safari uses
  `scripts`. `type: "module"` applies to both forms, so the same ES-module file
  is reused and no duplicated background code is introduced.
- The background code is unchanged: it only uses `chrome.*` APIs and static
  imports, which behave the same in a service worker and in an event page.
- No permission is added by this decision (rule 08); the browser support note is
  documented in the README.

### Consequences
- Minimum supported versions: **Chrome 121** and **Firefox 121**. The manifest
  stays minimal (no `minimum_chrome_version`/`strict_min_version` yet); the
  requirement is documented instead.
- Firefox becomes a supported manual-validation target again (`about:debugging`
  → temporary add-on), which was already the case for feature 01.
- Open question to verify in Firefox: whether `activeTab` is granted when the
  toolbar action opens a popup, and therefore whether `tab.url` is readable
  there. The popup already degrades gracefully (it shows "Cette page ne peut pas
  porter de notes…" instead of failing, rule 09); if Firefox turns out not to
  grant `activeTab` in that case, a dedicated decision will be needed rather
  than adding the broad `tabs` permission (rule 08).

## ADR-005 — Creating a note: protocol, activation gate, content rules

- Date: 2026-09-28
- Status: Accepted

### Context
Feature 04 ("créer une note pour le site courant") is the first **write**
operation on notes. ADR-002 and ADR-003 stated that UI gating is not a security
boundary and that create/update/delete must be validated inside the background
context (rule 07); ADR-003 fixed the storage model (`notes:<normalizedUrl>`),
the note shape and the popup ⇄ background protocol for reads.

### Decision
- **Protocol** (`shared/notes-messages.js`): `CREATE_NOTE_REQUEST { url, content }`
  → `CREATE_NOTE_RESULT { ok: true }` or `{ ok: false, reason }`, with reasons
  `INVALID_REQUEST`, `UNSUPPORTED_PAGE`, `DISABLED`, `INVALID_CONTENT`,
  `STORE_CONFLICT`, `WRITE_FAILED`. The request carries the raw tab URL and the
  typed text; both are re-validated in the background (rule 07).
- **Activation gate in the background**: `handleCreateNoteRequest` reads
  `activationEnabled` and refuses with `DISABLED` when the extension is off. The
  disabled `<fieldset id="notes-actions">` of ADR-002 only mirrors that decision
  in the UI; viewing stays ungated (ADR-003).
- **Content rules** (`shared/note.js`): content must be a string, non-empty
  after trimming and at most `MAX_NOTE_LENGTH` (5000) characters; it is stored
  trimmed, otherwise as typed (free text: accents, special characters, emojis,
  line breaks). The limit is defined once and applied to the `<textarea>`
  `maxlength` by script, so the displayed limit cannot drift from the validated
  one; the background remains authoritative.
- **Note identity**: the background builds the note with `createNote()`
  (`crypto.randomUUID()` id, `createdAt`/`updatedAt` = same ISO timestamp). The
  popup never invents ids or dates.
- **Additive, non-destructive write** (`addNoteForUrl`): the existing collection
  is read and appended to, so entries that `isValidNote` rejects (ADR-003) are
  preserved as-is. If the stored value is not an array, the write is refused
  (`STORE_CONFLICT`) instead of overwriting an unknown format.
- **No draft, no partial note (AC4)**: nothing is written until the form is
  submitted successfully; cancelling, closing the popup or a failed save creates
  nothing, and a failed save keeps the typed text in the still-open editor
  (rule 09).
- **UI**: the editor is a real `<form>` inside the existing
  `<fieldset id="notes-actions">`, so the activation gate of ADR-002 covers it
  natively. It uses a `<label>`, a `<textarea required>`, a submit button, a
  cancel button and an error paragraph (`role="alert"`, linked with
  `aria-describedby`). Focus moves to the textarea on open and back to the
  "Créer une note" button on close (rule 10); the submit button is disabled
  while a save is in flight, so a note cannot be created twice.
- **After a successful save** the popup re-reads the site's notes
  (`VIEW_NOTES_REQUEST`) and announces "Note enregistrée.": the list shows what
  is really stored instead of an optimistic client-side copy.

### Consequences
- "Modifier" and "Supprimer" remain UI-only until their own features; the hint
  under the buttons says so (ADR-002).
- Read-modify-write of a site's array is not atomic: two popups saving at the
  exact same moment could drop one note. Accepted for a single-user local
  extension; a serialized write path would be needed otherwise.
- Failed saves surface as `WRITE_FAILED`/`STORE_CONFLICT` with an actionable
  message, and the typed text is never discarded.
- Editing an existing note (next feature) should reuse the same message pattern
  and content rules, with `STORE_CONFLICT` still protecting unknown formats.

## ADR-006 — Editing a note: per-note action, update protocol, editor reuse

- Date: 2026-09-29
- Status: Accepted

### Context
Feature 05 ("modifier une note existante") needs an entry point into the edit
flow (AC1), a write that changes only the targeted note's content (AC2/AC3), no
write before the user submits (AC4), and an update action that is unavailable
while the extension is off (AC5). ADR-002 made
`<fieldset id="notes-actions" disabled>` the UI gate for note actions, but the
notes list is deliberately **outside** that fieldset so notes stay readable when
the extension is off (ADR-003 / feature 03 AC5). ADR-005 added the first write
operation (create) and stated that editing "should reuse the same message
pattern and content rules".

### Decision
- **Entry point: a per-note "Modifier" button** (`popup/note-item.js`), and the
  global placeholder button is removed. AC1 says the user edits *that* note; with
  several notes on a site, a single global button could not designate a target
  without adding a selection step. The button's accessible name also carries an
  excerpt of the note's content, so the several "Modifier" buttons stay
  distinguishable for screen readers (rule 10).
- **Gating (AC5)**: because the list sits outside the disabled fieldset, the
  buttons are rendered **disabled** and are opened only after the notes section
  has read a `true` activation state through `shared/activation-state.js` (a read
  failure keeps them closed — least permissive).
  `watchActivationEnabled` keeps them in sync when the user toggles the checkbox
  while the popup is open. The background context re-checks the flag and answers
  `DISABLED`; UI gating is not a security boundary (rule 07).
- **Protocol** (`shared/notes-messages.js`): `UPDATE_NOTE_REQUEST { url, id, content }`
  → `UPDATE_NOTE_RESULT { ok: true }` or `{ ok: false, reason }`, with
  `NOTES_EDIT_FAILURE` = `INVALID_REQUEST`, `UNSUPPORTED_PAGE`, `DISABLED`,
  `INVALID_CONTENT`, `NOTE_NOT_FOUND`, `STORE_CONFLICT`, `WRITE_FAILED`. Reason
  strings keep the same values across operations (`NOTE_NOT_FOUND` is the only
  new one), so a single UI mapping covers creation and editing.
- **No new permission, no new storage model**: the popup still only sends the raw
  tab URL, the target note id and the new text; `normalizeUrl`,
  `normalizeNoteContent` (`MAX_NOTE_LENGTH`) and the activation check are
  re-applied in the background.
- **Store** (`shared/notes-store.js`): `updateNoteForUrl(url, id, content)`
  rewrites **only** the targeted note, at its original position; other entries —
  including ones `isValidNote` rejects — are preserved untouched. A stored value
  that is not an array is refused (`STORE_CONFLICT`), an unknown id is reported
  as `NOTE_NOT_FOUND`. `shared/note.js` gains `updateNoteContent(note, content)`,
  which keeps `id`, `url`, `createdAt` and refreshes `updatedAt`.
- **Editor reuse** (`popup/note-editor.js`): the existing form now has two modes
  (`openCreate` / `openEdit`) sharing one submit path; `onSubmit` receives a
  draft `{ noteId, content }` (`noteId: null` = creation), so the section decides
  between `CREATE_NOTE_REQUEST` and `UPDATE_NOTE_REQUEST`. Reopening the same
  target keeps the in-progress text (rule 09); opening another target shows that
  target's content. Nothing is written before a submit (AC4), and focus returns
  to the button that opened the editor — the per-note button, not a fixed one.
- **File size** (rule 04): the three note handlers moved out of
  `service-worker/service-worker.js` into a new
  `service-worker/note-requests.js`; the former now only checks the sender and
  routes messages (93 lines), the latter holds the handlers (173 lines).

### Consequences
- Editing shows what is really stored: after a successful save the popup re-reads
  the site's notes and announces "Note modifiée.".
- "Supprimer" remains UI-only until its own feature; the hint under the buttons
  says so.
- The read-modify-write of a site's array is still not atomic (same accepted
  limitation as ADR-005), and switching target inside the editor discards the
  unsaved draft — no stored note is ever lost, and nothing is written without
  "Enregistrer".
- `NOTE_NOT_FOUND` covers the note being removed between display and save; the
  message asks the user to reopen the popup, since the list is not refreshed
  under the open editor.
- A future deletion feature should reuse this pattern (per-note button, same
  gating, same `NOTE_NOT_FOUND` semantics).


## ADR-007 — Deleting a note: confirmation dialog, per-note action, shared write pipeline

- Date: 2026-09-29
- Status: Accepted

### Context
Feature 06 ("supprimer une note") is the first **destructive** operation on
notes. AC1 requires an explicit confirmation before anything is written, AC4
requires the site to leave the storage when its last note is deleted, and AC5
requires the action to be unavailable while the extension is off. ADR-006 ended
by recommending that deletion reuse its pattern (per-note button, same gating,
same `NOTE_NOT_FOUND` semantics), and ADR-005 stated that writes are re-validated
in the background (rule 07).

### Decision
- **Entry point**: a per-note "Supprimer" button next to "Modifier"
  (`popup/note-item.js`); its accessible name carries an excerpt of the note
  (shared `formatNoteExcerpt` in `popup/note-texts.js`) so several "Supprimer"
  buttons stay distinguishable for screen readers (rule 10).
- **Confirmation**: a native `<dialog>` (`popup/delete-confirm.js`) placed
  outside the disabled `<fieldset>` so it stays operable (ADR-002 gating). The
  native element provides the focus trap, `Escape` and focus restore (rules 09,
  10); `Escape` is refused while a deletion is in flight so the request cannot
  be orphaned. The message shows the excerpt being deleted (AC1). The dialog
  stays open with an actionable message on failure (rule 15), and **nothing is
  written before the user presses "Supprimer" in the dialog** (AC2).
- **Protocol** (`shared/notes-messages.js`): `DELETE_NOTE_REQUEST { url, id }` →
  `DELETE_NOTE_RESULT { ok: true }` or `{ ok: false, reason }`, with
  `NOTES_DELETE_FAILURE` = `INVALID_REQUEST`, `UNSUPPORTED_PAGE`, `DISABLED`,
  `NOTE_NOT_FOUND`, `STORE_CONFLICT`, `WRITE_FAILED` (no `INVALID_CONTENT` — the
  content is untouched). The popup still sends the raw tab URL; the background
  re-normalizes it and re-checks the activation flag (rule 07).
- **Shared write pipeline**: `service-worker/note-write-pipeline.js` factors the
  step every write already had — normalize URL → activation check → apply the
  write → map store errors (`NotesStoreConflictError` plus the operation's
  not-found error) to result reasons — so create, update and delete cannot drift
  apart. `note-requests.js` registers the three write handlers in one
  `WRITE_OPERATIONS` table keyed by message type.
- **Store** (`shared/notes-store.js`): `removeNoteForUrl(url, id)` rewrites the
  site's array without the targeted note; other entries — including ones
  `isValidNote` rejects — are preserved. **When the array becomes empty the key
  is removed** (AC4): the site leaves the storage instead of keeping an empty
  array. A non-array value is refused (`NotesStoreConflictError`), an unknown id
  is reported as `NotesStoreNoteNotFoundError`.
- **UI split** (rule 04): `popup/notes-list.js` owns the read/write cycle of the
  list (load, save, remove, focus restoration); `popup/notes-section.js` becomes
  the wiring layer (editor + confirmation + activation tracking). After a
  successful removal the popup re-reads the site's notes (the list shows what is
  really stored) and announces "Note supprimée."; because the deleted note's
  button is gone, focus falls back to "Créer une note" (rule 10). When the site
  becomes empty, `renderNotes` shows the empty-state text together with the
  success message.
- **Failure texts**: `popup/note-texts.js` centralizes the user-facing texts for
  save and delete failures plus the excerpt helper; `popup/notes-client.js`
  keeps one `REQUEST_FAILURES` table keyed by message type instead of a map per
  operation.
- No new permission, no storage-model change; `manifest.json` version `0.6.0`.

### Consequences
- Deleting is safe by construction: no write without explicit confirmation
  (AC2), other notes untouched, key removed on the last note (AC4), background
  refusal while disabled (AC5) — UI gating alone is never the boundary (rule 07).
- A failure leaves the dialog open with the reason displayed and the accept
  button re-enabled, so the user can retry without losing context (rule 15).
- The accepted read-modify-write non-atomicity of ADR-005 still applies, and
  `NOTE_NOT_FOUND` covers a note removed between display and confirmation.
- All modules stay ≤200 lines (largest: `popup/notes-client.js`, 194).
- Automated verification runs against the real modules with simulated `chrome.*`
  and DOM (27 checks); manual validation in Chrome and Firefox is completed and
  recorded in `tasks/00-tasks-status.md`.


## ADR-008 — Optional note image: inline data URL, accepted types, update semantics

- Date: 2026-09-30
- Status: Accepted

### Context
Feature 07 ("ajouter une image à une note") lets the user paste an image into a
note (AC1), with the image optional (AC2), carried **with** the note's text
(AC3) and persisted on save (AC4). ADR-003 fixed the storage model (one
`notes:<normalizedUrl>` key per site, read by the display path) and ADR-005/006
fixed the write protocol and the content rules; ADR-007 factored the shared
write pipeline. The new question is where an image lives, which types are
acceptable, and what "no image" means in the protocol.

### Decision
- **Storage: inline data URL inside the note.** The note gains an `image` field
  holding `data:image/…;base64,…` or `null` (absent on pre-feature notes, which
  stay valid). A separate key or a second store was rejected: the display path
  must keep reading exactly one key per site (rule 09), and an image is part of
  its note (AC3), not an independent entity.
- **Accepted types** (`shared/note-image.js`): `image/png`, `image/jpeg`,
  `image/gif`, `image/webp`. `image/svg+xml` is excluded because an SVG can
  embed script and a note is untrusted data (rule 07). Only `data:` URLs of
  those types are accepted — a remote URL would make the popup fetch a
  third-party resource, which the extension never does today.
- **Size limit: 1 Mo per image** (`MAX_NOTE_IMAGE_BYTES`), enforced without
  decoding base64 (`estimateDecodedBytes`). `chrome.storage.local` is a shared
  ~5 Mo quota: a single note must not be able to make every later write
  impossible, and an oversized image is refused with `INVALID_IMAGE` rather than
  silently truncated (rule 15).
- **Protocol** (`shared/notes-messages.js`): `CREATE_NOTE_REQUEST { url, content, image? }`
  and `UPDATE_NOTE_REQUEST { url, id, content, image? }`, with a new reason
  `INVALID_IMAGE` added to `NOTES_CREATE_FAILURE` and `NOTES_EDIT_FAILURE`
  (reason strings keep shared values across operations).
  `undefined`/absent `image` means "keep the stored image" on update, `null`
  means "remove it", a data URL means "replace it" — which is why
  `updateNoteForUrl(url, id, content, image = undefined)` and
  `updateNoteContent(note, content, image = undefined)` keep that default.
- **Where validation happens**: the popup only filters pasted files by accepted
  type (so an unusable paste is ignored rather than shown), and the background
  re-validates type **and** size before writing (rule 07). The image is read in
  the popup with `FileReader` (`data:` URL), so no permission and no network
  access is added: `manifest.json` stays at `storage` + `activeTab` (rule 08).
- **Never write before save** (AC4): the pasted image lives in the editor's
  draft only; cancelling or closing the popup writes nothing, and a failed save
  keeps both the text and the pasted image in the open editor (rule 09).
- **UI**: the editor gains an image slot managed by `popup/note-editor-image.js`
  (paste listener, preview `<img>`, "Retirer l'image"), which keeps
  `popup/note-editor.js` under the 200-line guideline of rule 04; the note list
  shows the image with an `alt` naming the note (rule 10). Errors are surfaced
  in the editor's existing `role="alert"` paragraph.

### Consequences
- Notes with images consume the shared `chrome.storage.local` quota much faster
  (~4/3 of the image size, base64 overhead). A quota failure surfaces as
  `WRITE_FAILED` without losing the typed text, but no compression or purge
  exists — accepted for a local, single-user extension and documented in the
  README.
- The note model stays backward compatible: notes without an `image` key remain
  valid, and `isValidNote` ignores entries whose image is not acceptable (they
  stay in storage, they are simply not displayed) — the ADR-003 behaviour.
- One image per note, replaced by a new paste: a multi-image note would need its
  own decision (array of images, size budget per note).
- Paste is the only input path (no file picker, no drag and drop); a second
  input path only needs to feed the same `note-editor-image.js` slot.

## ADR-009 — Notes keyed by domain (host), with one-time migration

- Date: 2026-09-30
- Status: Accepted

### Context
Bug report: notes do not persist by domain name. ADR-003 keyed notes by the
**normalized page URL** (`notes:<normalizedUrl>` kept the path and query
string), so `/boards/36/backlog` and `/boards/36?filter=…` were two different
storage keys: a note created on one page "disappeared" as soon as the user
navigated within the same site. Internal SPA navigation, query parameters
(filters, tracking) and fragments change the key without changing the site.
ADR-003 had also declared `normalizeUrl` a fixed contract that every future
feature must reuse — the contract itself had to change.

### Decision
- **Site key = host only.** `shared/url.js` replaces `normalizeUrl(rawUrl)` with
  `normalizeSiteKey(rawUrl)`: same `http:`/`https:` gate, but only
  `parsedUrl.host` is returned (path, query and fragment dropped). Storage keys
  become `notes:<host>` (`notes:exemple.fr`). `http`/`https` of a host share
  their notes; `www.example.com` and `example.com` stay distinct (merging could
  attribute a note to the wrong site).
- **Note field `url` → `site`.** A note is
  `{ id, site, content, image?, createdAt, updatedAt }`; `createNote(siteKey,
  …)` and `isValidNote` follow. The popup never stores or displays the full
  page URL of a note.
- **Protocol**: `VIEW_NOTES_RESULT` success payload carries `site` (the host)
  instead of `siteUrl`; the popup's answer validation and the site label read
  that field. Requests still send the raw tab URL — the background re-derives
  the host (`normalizeSiteKey`) for every read and write, so the popup cannot
  choose a key (rule 07). No message type, reason code or permission changes.
- **Store renames** (`shared/notes-store.js`): `buildNotesStorageKey(siteKey)`,
  `readNotesForSite`, `addNoteForSite`, `updateNoteForSite`,
  `removeNoteForSite` — same behaviour, `ForUrl` → `ForSite` and
  `normalizedUrl` → `siteKey` throughout (including the shared write pipeline).
- **One-time migration** (`service-worker/notes-migration.js`): at background
  startup, legacy keys (`notes:` + full URL) are merged into `notes:<host>`
  keys and only then removed. Version-flagged (`notesStorageVersion` = 2);
  a run with no legacy keys is a single key read. The merge is non-destructive
  and idempotent: existing host-key notes are kept, migrated notes are deduped
  by `id`, a legacy note gains `site` (its `url` field is dropped), entries
  `isValidNote` rejects and non-array values are left untouched with a warning.
  An interrupted run simply retries at the next startup. Failures are logged
  and never break the service worker.

### Consequences
- The reported bug is fixed by construction: any navigation inside a domain
  reads/writes the same single key, and the popup still reads exactly one key
  per display (rule 09).
- Users' existing notes are preserved by the migration; until it succeeds,
  legacy keys remain readable-in-place only (the display path never sees them).
- ADR-003/005/006/007/008 keep their history but their
  `notes:<normalizedUrl>` / `normalizeUrl` / `note.url` references are
  superseded by this ADR.
- `manifest.json` version `0.8.0`; README, `tasks/00-tasks-status.md` and the
  popup/manifest wording ("par domaine") updated.


