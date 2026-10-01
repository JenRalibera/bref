# 5. TypeScript

TypeScript is **not currently mandated** for this project — the stack has
not been decided yet. If TypeScript is adopted (see
[ADRs](./21-architecture-decision-records.md)), the following rules apply
immediately and are non-negotiable:

- Enable **`strict: true`** in `tsconfig.json` (which includes
  `strictNullChecks`, `noImplicitAny`, etc.). Do not weaken strictness to
  make errors disappear.
- Prefer precise **types/interfaces** for all public function signatures,
  Chrome message payloads, and stored data shapes.
- **Avoid `any`.** If a type is genuinely unknown (e.g. data from an
  external/untyped source), use **`unknown`** and narrow it with type guards
  before use.
- Use **discriminated unions** for message types and state variants (e.g.
  `{ type: "NOTE_SAVE_REQUEST"; ... } | { type: "NOTE_SAVE_RESULT"; ... }`)
  instead of loosely-typed objects with optional fields.
- All exported functions must have **explicit parameter and return types**
  (do not rely solely on inference for public APIs).
- Use `@types/chrome` (or equivalent) for **type-safe Chrome API usage**
  instead of casting to `any` around `chrome.*` calls.
- Prefer `interface` for object shapes that may be extended, `type` for
  unions/aliases/utility compositions — pick one convention and apply it
  consistently within the codebase.
- Do not introduce TypeScript for a subset of files only "because it's
  convenient" — adopt it project-wide via an explicit decision, or not at
  all, to avoid inconsistent tooling and mixed `.js`/`.ts` ambiguity.