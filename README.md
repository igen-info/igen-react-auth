# React Keycloak Auth Helpers

Small utilities to bootstrap Keycloak authentication in React apps.

## Installation

```bash
pnpm add @igen/react-auth keycloak-js react
```

## Usage

```tsx
// keycloak.ts
import { createKeycloakClient } from '@igen/react-auth';

export const keycloak = createKeycloakClient({
    url: 'https://your-keycloak.com',
    realm: 'myrealm',
    clientId: 'myclient',
});
```

```tsx
// app entry
import { AuthProvider, useAuth } from '@igen/react-auth';
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

### `AuthProvider` props

-   `keycloak` (optional): an existing `Keycloak` instance.
-   `config` (optional): `KeycloakConfig` used to create a client when `keycloak` is not provided.
-   `initOptions` (optional): overrides defaults (`login-required`, `S256`, silent SSO URL when available).
-   `refreshIntervalSeconds` (optional): how often to call `updateToken`; default `30`.

Exactly one of `keycloak` or `config` is required.

### `useAuth`

Returns `{ initialized, authenticated, token, login, logout }` for your components. Must be used inside `AuthProvider`.

### `createKeycloakClient(config)`

Factory that returns a `Keycloak` instance; handy for sharing a singleton across your app.

### Silent SSO

If you enable silent SSO (default), host `silent-check-sso.html` at `/silent-check-sso.html` on the same origin.

## Tooling

- Lint: `pnpm exec eslint .`
- Git hook: Husky pre-commit runs ESLint automatically.

## Demo app

A minimal Vite demo is included under `demo/` to exercise the provider.

- Update `demo/src/main.tsx` with your Keycloak `url`, `realm`, and `clientId`.
- Ensure `demo/public/silent-check-sso.html` is hosted (default when running dev/preview).
- Run `pnpm dev:demo` and open the shown URL, or build with `pnpm build:demo` and preview with `pnpm preview:demo`.
