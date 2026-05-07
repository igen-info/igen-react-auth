---
name: igen-auth-demo
description: Use when working on the igen-auth Vite demo app, demo Keycloak configuration, silent-check-sso.html, or browser integration examples. Do not use for library-only internal refactors unless the demo is affected.
---

# igen-auth demo workflow

## Scope

Use this skill for changes under `demo/` or for library changes that require validating the demo app.

## Demo principles

- Keep demo configuration safe and generic.
- Do not commit real Keycloak server URLs, realms, client IDs, secrets, tokens, or screenshots with sensitive data.
- Prefer clear placeholder values and comments that show where users should configure their environment.
- Keep the demo minimal: it should demonstrate provider setup, loading state, unauthenticated login, authenticated token preview, and logout.

## Silent SSO

If silent SSO is enabled in examples:

- Ensure `demo/public/silent-check-sso.html` exists.
- Ensure documentation says the file must be served from the same origin.
- Do not move the file into a path that Vite will not serve as `/silent-check-sso.html`.

## Validation

Run:

```bash
pnpm build
pnpm build:demo
```

Use `pnpm dev:demo` only when interactive browser verification is needed.

## Documentation

Update `README.md` when the demo setup steps change.
