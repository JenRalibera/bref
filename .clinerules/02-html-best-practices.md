# 2. HTML Best Practices

- Use **semantic HTML** elements (`<button>`, `<nav>`, `<header>`, `<main>`,
  `<section>`, `<dialog>`, `<form>`, etc.) instead of generic `<div>`/`<span>`
  wrappers whenever a semantic equivalent exists.
- Every document (popup, options page, extension pages) must have correct
  structure: `<!DOCTYPE html>`, `<html lang="...">`, a single `<head>` with
  `<meta charset>` and `<meta name="viewport">` where relevant, and a single
  `<title>`.
- **Forms**: use `<form>`, `<label>` (explicitly associated via `for`/`id`
  or wrapping), appropriate `<input type>` values, and native validation
  attributes (`required`, `pattern`, `minlength`, etc.) before reinventing
  validation in JavaScript.
- **Interactive elements**: use `<button>` for actions and `<a href>` for
  navigation. Never bind click handlers to non-interactive elements (`<div>`,
  `<span>`) to fake buttons/links.
- **Keyboard navigation** must work for every interactive element: natural
  tab order, visible focus, and support for `Enter`/`Space` activation where
  applicable. Do not trap focus except in intentional modal dialogs, and
  provide a way out (e.g. `Escape`).
- **ARIA** is a last resort, not a first choice. Only add ARIA attributes
  when native semantics cannot express the required role/state (e.g.
  `aria-live` for status regions, `aria-expanded` for disclosure widgets).
  Follow the rule: "No ARIA is better than bad ARIA."
- **Images**: always provide meaningful `alt` text for informative images,
  and `alt=""` for purely decorative images. Website favicons and site
  thumbnails/previews must have descriptive `alt` text (e.g. "Favicon of
  example.com").
- Avoid unnecessary wrapper `<div>`s — every element should have a structural
  or styling purpose.
- **No inline JavaScript** (`onclick="..."`, `javascript:` URLs). This is
  also required by the extension's Content Security Policy (see
  [Security](./07-security.md)). Attach event listeners from script files.
- Prefer **progressive enhancement**: core structure and content should be
  present and meaningful in HTML; JavaScript enhances behavior, it does not
  create the entire DOM from nothing when static markup would do.
- Keep HTML maintainable: consistent indentation, one root purpose per file,
  and no deeply nested markup that could be flattened.