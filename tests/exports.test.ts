import { describe, expect, it } from 'vitest';
import * as coreEntry from '../src/core.js';
import * as rootEntry from '../src/index.js';
import * as reactEntry from '../src/react.js';

describe('public source entrypoints', (): void => {
    it('exposes a React-free core entrypoint', (): void => {
        expect(coreEntry.createAuthClient).toBeTypeOf('function');
        expect(coreEntry.createKeycloakClient).toBeTypeOf('function');
        expect('AuthProvider' in coreEntry).toBe(false);
    });

    it('keeps root and explicit React entrypoints compatible', (): void => {
        expect(rootEntry.AuthProvider).toBe(reactEntry.AuthProvider);
        expect(rootEntry.useAuth).toBe(reactEntry.useAuth);
        expect(rootEntry.createAuthClient).toBe(coreEntry.createAuthClient);
    });
});
