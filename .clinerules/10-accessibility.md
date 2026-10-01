# 10. Accessibility

Accessibility is a **required property of the UI**, not an optional
enhancement, and applies to the popup, options page, and any injected
content-script UI.

- All interactive elements must be **reachable and operable via keyboard**
  alone (Tab/Shift+Tab to navigate, Enter/Space to activate, Escape to
  dismiss overlays/dialogs).
- Maintain a logical **focus order** matching visual/reading order. When
  opening a dialog/overlay (e.g. the note editor or a delete-confirmation
  dialog), move focus into it; when closing it, return focus to the
  triggering element.
- Provide visible **`:focus-visible`** styling — never suppress focus
  outlines without an equally visible replacement.
- Use **semantic HTML** first; add **ARIA** only to fill genuine gaps (e.g.
  `aria-live="polite"` for a "Note saved" status message,
  `role="dialog"` + `aria-modal="true"` for custom overlays).
- Ensure **screen reader** users receive equivalent information to sighted
  users: meaningful labels, status announcements for async operations
  (saving, saved, failed), and no information conveyed by color/icon alone.
- Meet **color contrast** minimums (WCAG AA: 4.5:1 normal text, 3:1 large
  text/UI elements) for all text and meaningful UI elements.
- Every form control must have an associated, visible **label** (not only a
  placeholder).
- **Error and status messages** must be programmatically associated with
  their control (e.g. `aria-describedby`) and announced to assistive
  technology when they appear.
- Respect **`prefers-reduced-motion`**: avoid non-essential animations, or
  provide a reduced/no-animation alternative, for users who request it.