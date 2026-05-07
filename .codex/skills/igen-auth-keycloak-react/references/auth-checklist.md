# Auth change checklist

Before finalizing a Keycloak/React auth change:

- Does `AuthProvider` still require exactly one of `keycloak` or `config`?
- Does `useAuth()` still work only inside the provider?
- Are tokens kept out of logs and persistent storage?
- Are refresh timers cleaned up?
- Are browser globals guarded where needed?
- Does the README still match the API?
- Were `pnpm exec eslint .`, `pnpm build`, and, if relevant, `pnpm build:demo` run?
