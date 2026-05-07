import Keycloak, { type KeycloakConfig, type KeycloakInitOptions } from 'keycloak-js';
import { type FC, type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createKeycloakClient } from './core.js';

export * from './core.js';

export type AuthContextValue = {
    initialized: boolean;
    authenticated: boolean;
    token: string | undefined;
    keycloak: Keycloak | undefined;
    error: Error | undefined;
    login: () => void;
    logout: () => void;
};

type AuthProviderProps = {
    children: ReactNode;
    keycloak?: Keycloak;
    config?: KeycloakConfig;
    initOptions?: KeycloakInitOptions;
    /**
     * How often (in seconds) the token refresh should be attempted.
     * Defaults to 30 seconds.
     */
    refreshIntervalSeconds?: number;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: FC<AuthProviderProps> = ({ children, keycloak, config, initOptions, refreshIntervalSeconds = 30 }) => {
    const [initialized, setInitialized] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [token, setToken] = useState<string | undefined>(undefined);
    const [error, setError] = useState<Error | undefined>(undefined);

    const keycloakClient = useMemo(() => {
        if (keycloak) return keycloak;
        if (!config) {
            throw new Error('AuthProvider requires either a pre-built Keycloak instance or a config object.');
        }
        return createKeycloakClient(config);
    }, [keycloak, config]);

    const resolvedInitOptions = useMemo<KeycloakInitOptions>(() => {
        const base: KeycloakInitOptions = {
            onLoad: 'login-required',
            pkceMethod: 'S256',
            ...initOptions,
        };

        if (typeof window !== 'undefined') {
            const defaultSilentCheckUri = `${window.location.origin}/silent-check-sso.html`;
            base.silentCheckSsoRedirectUri = base.silentCheckSsoRedirectUri ?? defaultSilentCheckUri;
        }

        return base;
    }, [initOptions]);

    useEffect(() => {
        let isCancelled = false;
        let refreshIntervalId: number | undefined;

        const client = keycloakClient as Keycloak & {
            __initPromise?: Promise<boolean>;
        };

        if (!client.__initPromise) {
            client.__initPromise = client.init(resolvedInitOptions);
        }

        client.__initPromise
            .then((auth: boolean) => {
                if (isCancelled) return;

                setAuthenticated(auth);
                setToken(client.token ?? undefined);
                setInitialized(true);

                client.onAuthSuccess = (): void => {
                    setAuthenticated(true);
                    setToken(client.token ?? undefined);
                };

                client.onAuthLogout = (): void => {
                    setAuthenticated(false);
                    setToken(undefined);
                };

                client.onAuthRefreshSuccess = (): void => {
                    setToken(client.token ?? undefined);
                };

                client.onTokenExpired = (): void => {
                    void client.updateToken(30).catch((err) => {
                        console.error('Failed to refresh token after expiration', err);
                        setAuthenticated(false);
                        setToken(undefined);
                    });
                };

                refreshIntervalId = window.setInterval((): void => {
                    void client
                        .updateToken(60)
                        .then((refreshed: boolean) => {
                            if (refreshed && !isCancelled) {
                                setToken(client.token ?? undefined);
                            }
                        })
                        .catch((err) => {
                            console.error('Failed to refresh token', err);
                        });
                }, refreshIntervalSeconds * 1000);
            })
            .catch((err) => {
                console.error('Keycloak init error', err);
                if (!isCancelled) {
                    setError(err instanceof Error ? err : new Error('Keycloak failed to initialize'));
                    setInitialized(true);
                    setAuthenticated(false);
                }
            });

        return (): void => {
            isCancelled = true;
            if (refreshIntervalId !== undefined) {
                clearInterval(refreshIntervalId);
            }
        };
    }, [keycloakClient, refreshIntervalSeconds, resolvedInitOptions]);

    const login = useCallback((): void => {
        void keycloakClient.login();
    }, [keycloakClient]);

    const logout = useCallback((): void => {
        if (typeof window !== 'undefined') {
            void keycloakClient.logout({ redirectUri: window.location.origin });
        } else {
            void keycloakClient.logout();
        }
    }, [keycloakClient]);

    const value = useMemo(
        () => ({
            initialized,
            authenticated,
            token,
            keycloak: keycloakClient,
            error,
            login,
            logout,
        }),
        [initialized, authenticated, token, keycloakClient, error, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
