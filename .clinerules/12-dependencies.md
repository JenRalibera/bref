# 12. Dependencies

Before adding any third-party dependency, the AI must evaluate and be able
to justify:

1. **Necessity** — can this be solved with a native browser/Chrome
   extension API or a small amount of first-party code? If yes, prefer that.
2. **Maintenance status** — is the library actively maintained, with recent
   releases and a healthy issue/PR history?
3. **Security** — any known vulnerabilities (check advisories), and how
   much third-party code/surface area it introduces.
4. **Bundle size** — impact on the shipped extension size, especially for
   content scripts injected into every page.
5. **License** — must be compatible with the project's distribution as a
   Chrome extension (avoid copyleft licenses that conflict with the
   project's distribution model, unless explicitly reviewed).
6. **Complexity introduced** — does it bring its own build step, config,
   runtime, or mental model that outweighs the problem it solves?

**Do not add a dependency merely for convenience** if the native platform or
a small utility function solves the problem adequately. Any new dependency
must be explicitly called out for review (see
[Architecture Decision Records](./21-architecture-decision-records.md) for
significant/major dependencies).