# Keycloak Auth Helpers

Small utilities to bootstrap Keycloak authentication with or without React.

## Installation

```bash
pnpm add @igen/auth keycloak-js
```

Install React only when using the React provider:

```bash
pnpm add react
```

## Without React

Use the React-free core entrypoint in vanilla apps, other UI frameworks, or shared auth modules.

```ts
import { createAuthClient } from '@igen/auth/core';

const auth = createAuthClient({
    config: {
        url: 'https://your-keycloak.com',
        realm: 'myrealm',
        clientId: 'myclient',
    },
});

const unsubscribe = auth.subscribe((state) => {
    if (!state.initialized) return;

    if (state.authenticated) {
        console.log('Authenticated');
        return;
    }

    console.log('Not authenticated');
});

void auth.init();

document.querySelector('#login')?.addEventListener('click', () => auth.login());
document.querySelector('#logout')?.addEventListener('click', () => auth.logout());

window.addEventListener('beforeunload', () => {
    unsubscribe();
    auth.destroy();
});
```

### `createAuthClient(options)`

Creates a framework-agnostic auth client. Exactly one of `keycloak` or `config` is required.

- `keycloak` (optional): an existing `Keycloak` instance.
- `config` (optional): `KeycloakConfig` used to create a client when `keycloak` is not provided.
- `initOptions` (optional): overrides defaults (`login-required`, `S256`, silent SSO URL when available).
- `refreshIntervalSeconds` (optional): how often to call `updateToken`; default `30`.

The returned client exposes:

- `init()`: initializes Keycloak and resolves to auth state.
- `getState()`: returns the current `{ initialized, authenticated, token, keycloak, error }` state.
- `subscribe(listener)`: listens for state updates and returns an unsubscribe function.
- `login()`, `logout()`: start Keycloak login/logout flows.
- `refresh(minValidity)`: manually refreshes the token.
- `destroy()`: clears refresh timers and listeners.

## With React

```tsx
// keycloak.ts
import { createKeycloakClient } from '@igen/auth/core';

export const keycloak = createKeycloakClient({
    url: 'https://your-keycloak.com',
    realm: 'myrealm',
    clientId: 'myclient',
});
```

```tsx
// app entry
import { AuthProvider, useAuth } from '@igen/auth/react';
import { keycloak } from './keycloak';

export const App = () => (
    <AuthProvider keycloak={keycloak}>
        <Routes />
    </AuthProvider>
);

const Routes = () => {
    const { initialized, authenticated, login, logout, token } = useAuth();

    if (!initialized) return <div>Loading auth...</div>;
    if (!authenticated) return <button onClick={login}>Log in</button>;

    return (
        <div>
            <div>Token: {token?.slice(0, 10)}...</div>
            <button onClick={logout}>Log out</button>
        </div>
    );
};
```

For backwards compatibility, React APIs are also exported from `@igen/auth`.

### `AuthProvider` props

- `keycloak` (optional): an existing `Keycloak` instance.
- `config` (optional): `KeycloakConfig` used to create a client when `keycloak` is not provided.
- `initOptions` (optional): overrides defaults (`login-required`, `S256`, silent SSO URL when available).
- `refreshIntervalSeconds` (optional): how often to call `updateToken`; default `30`.

Exactly one of `keycloak` or `config` is required.

### `useAuth`

Returns `{ initialized, authenticated, token, keycloak, error, login, logout }` for your components. Must be used inside `AuthProvider`.

### `createKeycloakClient(config)`

Factory that returns a `Keycloak` instance; handy for sharing a singleton across your app. Import it from `@igen/auth/core` when you do not use React.

### Silent SSO

If you enable silent SSO, host `silent-check-sso.html` at `/silent-check-sso.html` on the same origin as your app. The default silent SSO redirect URI is only added when a browser `window` is available.

## Tooling

- Lint: `pnpm exec eslint .`
- Git hook: Husky pre-commit runs ESLint automatically.

## Demo app

A minimal Vite demo is included under `demo/` to exercise the provider.

- Update `demo/src/main.tsx` with your Keycloak `url`, `realm`, and `clientId`.
- Ensure `demo/public/silent-check-sso.html` is hosted (default when running dev/preview).
- Run `pnpm dev:demo` and open the shown URL, or build with `pnpm build:demo` and preview with `pnpm preview:demo`.
