# 3. CSS Best Practices

- Prefer a **simple, readable CSS architecture** over complex systems.
  Organize styles by component/page (e.g. `popup.css`, `options.css`,
  `shared/tokens.css`) rather than one giant stylesheet, but do not introduce
  a heavy methodology (BEM/OOCSS/utility framework) unless the project's
  complexity actually justifies it.
- Use a **consistent naming convention** for classes (e.g. simple
  `kebab-case` or BEM-style `block__element--modifier`) — pick one and apply
  it uniformly across the project.
- Use **CSS custom properties** (`--color-primary`, `--space-md`, etc.) for
  design tokens: colors, spacing scale, typography scale, radii. Define them
  once at `:root` (or a scoped theme root) and reuse them; avoid hard-coded
  magic values scattered across files.
- Use **Flexbox** for one-dimensional layouts (toolbars, button groups,
  rows/columns) and **CSS Grid** for two-dimensional layouts (page/panel
  layouts, note-card grids). Do not use floats or absolute positioning as a
  substitute for layout unless there is a specific overlay/positioning need.
- Use a consistent **spacing scale** (via custom properties) rather than
  arbitrary pixel values.
- Define a small, consistent **typography scale** (font sizes, weights, line
  heights) instead of ad-hoc values per component.
- Always define visible **`:focus-visible`** styles for interactive elements.
  Never remove focus outlines without providing an equally visible
  replacement.
- Define intentional **`:hover`** states for interactive elements, but never
  rely on hover alone to convey information (keyboard/touch users won't see
  it).
- Respect **color contrast** requirements (WCAG AA minimum: 4.5:1 for normal
  text, 3:1 for large text/UI components).
- Responsive design: layouts (popup, options page, injected UI) must adapt
  gracefully to different viewport sizes/zoom levels. Avoid fixed pixel
  widths where flexible sizing is possible.
- **Avoid `!important`** except as a documented last-resort override (e.g.
  overriding a third-party style you don't control). If you need
  `!important` against your own CSS, fix the specificity/architecture
  instead.
- **Avoid excessive specificity** (long selector chains, ID selectors for
  styling, `!important` chains). Prefer single class selectors.
- **Avoid deeply nested selectors** (more than 2–3 levels). Flatten selectors
  and rely on class naming instead of nesting depth to express relationships.
- **Avoid duplicated styles** — extract repeated declarations into shared
  classes or custom properties.
- **Avoid inline `style="..."` attributes** except for genuinely dynamic,
  computed-at-runtime values (e.g. a dynamically positioned overlay) that
  cannot reasonably be expressed via a class/state toggle.
- Keep design tokens centralized and documented so the visual language stays
  consistent as the UI grows.