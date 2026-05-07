import type Keycloak from 'keycloak-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthClient, getFullName, getUsername, hasRole, isTokenExpired } from '../src/core.js';

type KeycloakEvent = (() => void) | undefined;

type MockKeycloak = {
    token?: string;
    tokenParsed?: {
        preferred_username?: string;
        name?: string;
    };
    onAuthSuccess?: KeycloakEvent;
    onAuthLogout?: KeycloakEvent;
    onAuthRefreshSuccess?: KeycloakEvent;
    onTokenExpired?: KeycloakEvent;
    init: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
    login: ReturnType<typeof vi.fn<() => Promise<void>>>;
    logout: ReturnType<typeof vi.fn<() => Promise<void>>>;
    updateToken: ReturnType<typeof vi.fn<(minValidity: number) => Promise<boolean>>>;
    hasRealmRole: ReturnType<typeof vi.fn<(role: string) => boolean>>;
    hasResourceRole: ReturnType<typeof vi.fn<(role: string) => boolean>>;
    isTokenExpired: ReturnType<typeof vi.fn<(minValidity?: number) => boolean>>;
};

const asKeycloak = (mock: MockKeycloak): Keycloak => {
    return mock as unknown as Keycloak;
};

const createMockKeycloak = (initResult: Promise<boolean> = Promise.resolve(true)): MockKeycloak => {
    return {
        token: 'initial-token',
        tokenParsed: {
            preferred_username: 'alice',
            name: 'Alice Example',
        },
        init: vi.fn<() => Promise<boolean>>().mockReturnValue(initResult),
        login: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
        logout: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
        updateToken: vi.fn<(minValidity: number) => Promise<boolean>>().mockResolvedValue(false),
        hasRealmRole: vi.fn<(role: string) => boolean>().mockReturnValue(false),
        hasResourceRole: vi.fn<(role: string) => boolean>().mockReturnValue(false),
        isTokenExpired: vi.fn<(minValidity?: number) => boolean>().mockReturnValue(false),
    };
};

afterEach((): void => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('createAuthClient', (): void => {
    it('initializes Keycloak and publishes authenticated state', async (): Promise<void> => {
        const keycloak = createMockKeycloak();
        const authClient = createAuthClient({ keycloak: asKeycloak(keycloak) });
        const states = [authClient.getState()];

        const unsubscribe = authClient.subscribe((state): void => {
            states.push(state);
        });

        const initializedState = await authClient.init();

        expect(keycloak.init).toHaveBeenCalledWith({
            onLoad: 'login-required',
            pkceMethod: 'S256',
        });
        expect(initializedState.initialized).toBe(true);
        expect(initializedState.authenticated).toBe(true);
        expect(initializedState.token).toBe('initial-token');
        expect(states.at(-1)).toMatchObject({
            initialized: true,
            authenticated: true,
            token: 'initial-token',
            error: undefined,
        });

        unsubscribe();
        authClient.destroy();
    });

    it('handles React StrictMode cleanup before an in-flight init resolves', async (): Promise<void> => {
        let resolveInit: ((authenticated: boolean) => void) | undefined;
        const initResult = new Promise<boolean>((resolve): void => {
            resolveInit = resolve;
        });
        const keycloak = createMockKeycloak(initResult);
        const authClient = createAuthClient({ keycloak: asKeycloak(keycloak) });
        const states: Array<{ initialized: boolean; authenticated: boolean }> = [];

        void authClient.init();
        authClient.destroy();

        authClient.subscribe((state): void => {
            states.push({
                initialized: state.initialized,
                authenticated: state.authenticated,
            });
        });
        const secondInit = authClient.init();

        expect(resolveInit).toBeDefined();
        resolveInit?.(true);
        await secondInit;

        expect(keycloak.init).toHaveBeenCalledTimes(1);
        expect(states).toContainEqual({
            initialized: true,
            authenticated: true,
        });

        authClient.destroy();
    });

    it('cleans up refresh intervals and listeners on destroy', async (): Promise<void> => {
        vi.useFakeTimers();
        vi.stubGlobal('window', {
            clearInterval,
            location: {
                origin: 'http://localhost:5173',
            },
            setInterval,
        });
        const keycloak = createMockKeycloak();
        const authClient = createAuthClient({
            keycloak: asKeycloak(keycloak),
            refreshIntervalSeconds: 10,
        });
        const listener = vi.fn();

        authClient.subscribe(listener);
        await authClient.init();
        await vi.advanceTimersByTimeAsync(10_000);

        expect(keycloak.updateToken).toHaveBeenCalledTimes(1);

        authClient.destroy();
        await vi.advanceTimersByTimeAsync(20_000);
        keycloak.onAuthLogout?.();

        expect(keycloak.updateToken).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('updates token state after a successful manual refresh', async (): Promise<void> => {
        const keycloak = createMockKeycloak();
        const authClient = createAuthClient({ keycloak: asKeycloak(keycloak) });

        await authClient.init();
        keycloak.token = 'refreshed-token';
        keycloak.updateToken.mockResolvedValueOnce(true);

        await expect(authClient.refresh(15)).resolves.toBe(true);

        expect(keycloak.updateToken).toHaveBeenCalledWith(15);
        expect(authClient.getState().token).toBe('refreshed-token');
    });

    it('sets initialized error state when Keycloak init rejects', async (): Promise<void> => {
        vi.spyOn(console, 'error').mockImplementation((): void => {});
        const keycloak = createMockKeycloak(Promise.reject(new Error('init failed')));
        const authClient = createAuthClient({ keycloak: asKeycloak(keycloak) });

        const state = await authClient.init();

        expect(state.initialized).toBe(true);
        expect(state.authenticated).toBe(false);
        expect(state.token).toBeUndefined();
        expect(state.error?.message).toBe('init failed');
    });

    it('requires exactly one Keycloak source', (): void => {
        const keycloak = createMockKeycloak();

        expect((): void => {
            createAuthClient({
                keycloak: asKeycloak(keycloak),
                config: { url: 'url', realm: 'realm', clientId: 'client' },
            } as unknown as Parameters<typeof createAuthClient>[0]);
        }).toThrow('not both');

        expect((): void => {
            createAuthClient({} as Parameters<typeof createAuthClient>[0]);
        }).toThrow('requires either');
    });
});

describe('token helper functions', (): void => {
    it('reads user fields, roles, and token expiration from Keycloak', (): void => {
        const keycloak = createMockKeycloak();
        keycloak.hasResourceRole.mockReturnValueOnce(true);
        keycloak.isTokenExpired.mockReturnValueOnce(true);

        expect(getUsername(asKeycloak(keycloak))).toBe('alice');
        expect(getFullName(asKeycloak(keycloak))).toBe('Alice Example');
        expect(hasRole(asKeycloak(keycloak), 'admin')).toBe(true);
        expect(isTokenExpired(asKeycloak(keycloak), 30)).toBe(true);
        expect(keycloak.isTokenExpired).toHaveBeenCalledWith(30);
    });
});
