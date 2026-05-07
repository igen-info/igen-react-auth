# igen-auth repository context

The repository is a TypeScript/React package named `@igen/auth`.

Core public concepts:

- `AuthProvider`: React provider that initializes Keycloak and exposes auth state.
- `useAuth`: hook for auth state and login/logout actions.
- `createKeycloakClient`: factory for a Keycloak instance.
- Silent SSO support expects `/silent-check-sso.html` on the same origin.

Known scripts:

- `build`: `tsc -p tsconfig.json`
- `dev:demo`: `vite --config demo/vite.config.ts`
- `build:demo`: `vite build --config demo/vite.config.ts`
- `preview:demo`: `vite preview --config demo/vite.config.ts`
- `test`: placeholder that exits with error unless changed later

Baseline validation:

```bash
pnpm exec eslint .
pnpm build
```
