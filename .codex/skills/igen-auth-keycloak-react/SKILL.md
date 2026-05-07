---
name: igen-auth-keycloak-react
description: Use when changing Keycloak, AuthProvider, useAuth, token refresh, silent SSO, login/logout, or React context behavior in igen-auth. Do not use for generic formatting or package metadata-only changes.
---

# Keycloak React auth workflow

## Core contract

Maintain the public behavior of `@igen/auth` unless the task explicitly asks for a breaking change.

Expected public API:

- `createKeycloakClient(config)` returns a Keycloak client instance.
- `createAuthClient(options)` is the React-free lifecycle API exported from `@igen/auth/core`.
- `AuthProvider` accepts exactly one of `keycloak` or `config`.
- `AuthProvider` may accept `initOptions` and `refreshIntervalSeconds`.
- `useAuth()` returns initialized/authenticated state, the current token, keycloak, error, and login/logout functions.
- `useAuth()` must fail clearly when used outside the provider.
- `@igen/auth` remains a backwards-compatible React entrypoint; `@igen/auth/react` is the explicit React entrypoint; `@igen/auth/core` must stay React-free.

## Security constraints

- Never print or persist raw access tokens, refresh tokens, ID tokens, or user profile claims in logs.
- Do not add token persistence to `localStorage`, `sessionStorage`, cookies, IndexedDB, or URL parameters unless explicitly requested.
- Avoid exposing Keycloak internals unnecessarily through the public hook.
- Treat authentication state as asynchronous and potentially stale between refresh calls.

## Initialization behavior

When editing initialization:

1. Preserve default behavior unless the task asks to change it.
2. Keep silent SSO behavior documented.
3. Guard browser-only values such as `window.location.origin` so imports do not fail in non-browser build contexts.
4. Ensure initialization state is set deterministically on success and failure.
5. Avoid double initialization during React render; initialize in effects or controlled setup paths.
6. Account for React 19 StrictMode effect setup/cleanup replay in development. Cleanup may run before an in-flight `keycloak.init()` resolves; reusing an init promise must still allow state updates on the second setup pass.

## Refresh behavior

When editing token refresh:

- Ensure intervals/timeouts are cleaned up on unmount.
- Avoid overlapping refresh loops.
- Handle `updateToken` errors without creating infinite noisy loops.
- Do not assume authentication remains true after a failed refresh.
- Prefer minimal refresh state exposed to consumers unless API expansion is requested.

## Documentation updates

Update `README.md` when changing:

- AuthProvider props.
- `useAuth()` return shape.
- silent SSO default behavior.
- login/logout semantics.
- required Keycloak config.

## Validation

Run:

```bash
pnpm exec eslint .
pnpm build
pnpm build:demo
```

If browser-only behavior cannot be fully validated, state the limitation and explain what was statically checked.
