# 14. Naming and Code Organization

Apply consistent naming across the entire project:

| Category | Convention | Example |
|---|---|---|
| Files (scripts) | `kebab-case.js` / `.ts` | `save-note.js` |
| Directories | `kebab-case` | `content-scripts/`, `service-worker/`, `popup/` |
| Variables / functions | `camelCase` | `saveNote()`, `noteList` |
| Constants (true constants) | `UPPER_SNAKE_CASE` | `MAX_NOTE_LENGTH` |
| Classes | `PascalCase` | `NoteEditor` |
| Types / Interfaces (if TS) | `PascalCase` | `NoteSaveRequestMessage` |
| CSS classes | `kebab-case` (consistent with chosen convention, see [CSS](./03-css-best-practices.md)) | `.note-editor` |
| Chrome message `type` values | `SCREAMING_SNAKE_CASE` string constants, defined once | `"NOTE_SAVE_REQUEST"` |
| Custom/DOM events | `kebab-case` with a namespace prefix | `notes:note-saved` |

- Names must **communicate intent** — prefer `saveNote()` over
  `doIt()` or `handle()`.
- Avoid abbreviations that aren't broadly understood (`cfg`, `mgr`) in favor
  of full words, except very common ones (`id`, `url`, `img`).
- Group related files by **feature/context** (e.g. `service-worker/`,
  `popup/`, `content-scripts/`, `shared/`) rather than purely by file type,
  once the project grows beyond a handful of files.
- Define **Chrome message type constants** in one shared, documented module
  so both senders and receivers reference the same source of truth.