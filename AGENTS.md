# AGENTS.md

## Project context

This repository contains `@igen/auth`, a small TypeScript/React library that provides helpers for bootstrapping Keycloak authentication in React applications.

Public API described by the README:

- `createKeycloakClient(config)` creates a Keycloak instance.
- `AuthProvider` initializes Keycloak and exposes auth state through React context.
- `useAuth()` returns `{ initialized, authenticated, token, login, logout }` and must be called under `AuthProvider`.
- The package expects a silent SSO page at `/silent-check-sso.html` when silent SSO is enabled.

## Repository shape

Important paths:

- `src/`: library source code. Keep package exports stable unless the task explicitly asks for a breaking change.
- `demo/`: Vite demo app used to validate real browser integration.
- `dist/`: generated build output. Do not edit manually.
- `package.json`: package metadata, scripts, dependencies, and export map.
- `tsconfig.json`: strict TypeScript config for library builds.
- `eslint.config.mts`: ESLint flat config.

## Package manager and commands

Use `pnpm` because the repo has a `pnpm-lock.yaml`.

Common commands:

```bash
pnpm install
pnpm exec eslint .
pnpm build
pnpm dev:demo
pnpm build:demo
pnpm preview:demo
```

Do not run `pnpm test` as a validation command unless tests have been added. At present, the `test` script is a placeholder that exits with an error.

## TypeScript and React rules

- Preserve strict TypeScript compatibility.
- Use explicit function return types, matching the ESLint config.
- Avoid `any`. Prefer Keycloak and React types.
- Use type-only imports when importing types.
- Keep public API types exported where users need them.
- Do not introduce runtime dependencies unless necessary.
- Keep React code compatible with the configured React 19 dependency.
- Avoid browser-only globals outside effects or guarded branches if code may be imported during build or SSR-like tooling.

## Keycloak/auth behavior rules

- Do not log full tokens, refresh tokens, ID tokens, or user profile payloads.
- Avoid storing tokens in `localStorage` or other persistent storage unless explicitly requested and documented as a security tradeoff.
- Prefer Keycloak's in-memory token handling.
- Preserve the existing contract that exactly one of `keycloak` or `config` is required for `AuthProvider`.
- When changing initialization options, document defaults and backwards compatibility.
- Treat silent SSO as browser-origin-sensitive. Ensure documentation explains that `silent-check-sso.html` must be served from the same origin.
- Ensure token refresh cleanup is handled when components unmount.

## Demo app rules

- Keep demo credentials/configuration as placeholders.
- Do not commit real Keycloak URLs, realms, client IDs, secrets, or tokens.
- Use the demo to verify integration behavior after changes to `AuthProvider`, `useAuth`, or initialization options.

## Validation expectations

For normal source changes, run at least:

```bash
pnpm exec eslint .
pnpm build
```

For changes affecting browser behavior or the demo, also run:

```bash
pnpm build:demo
```

If validation cannot be run, state exactly which command was not run and why.

## Change discipline

- Prefer small, focused changes.
- Do not reformat unrelated files.
- Do not edit generated `dist/` unless the task explicitly asks to prepare release artifacts.
- Update `README.md` when public API, setup, usage, package scripts, or silent SSO behavior changes.
- Keep examples minimal and copy-pasteable.
