import { type FC, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import Keycloak, { type KeycloakConfig, type KeycloakInitOptions } from 'keycloak-js';

export type AuthContextValue = {
    initialized: boolean;
    authenticated: boolean;
    token: string | undefined;
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

export const createKeycloakClient = (config: KeycloakConfig): Keycloak => new Keycloak(config);

export const AuthProvider: FC<AuthProviderProps> = ({ children, keycloak, config, initOptions, refreshIntervalSeconds = 30 }) => {
    const [initialized, setInitialized] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [token, setToken] = useState<string | undefined>(undefined);

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

        const clientWithMemoizedInit = keycloakClient as Keycloak & {
            __initPromise?: Promise<boolean>;
        };

        if (!clientWithMemoizedInit.__initPromise) {
            clientWithMemoizedInit.__initPromise = clientWithMemoizedInit.init(resolvedInitOptions);
        }

        clientWithMemoizedInit.__initPromise
            .then((auth: boolean) => {
                if (isCancelled) return;

                setAuthenticated(Boolean(auth));
                setToken(keycloakClient.token ?? undefined);
                setInitialized(true);

                keycloakClient.onAuthSuccess = (): void => {
                    setAuthenticated(true);
                    setToken(keycloakClient.token ?? undefined);
                };

                keycloakClient.onAuthLogout = (): void => {
                    setAuthenticated(false);
                    setToken(undefined);
                };

                keycloakClient.onAuthRefreshSuccess = (): void => {
                    setToken(keycloakClient.token ?? undefined);
                };

                keycloakClient.onTokenExpired = (): void => {
                    void keycloakClient.updateToken(30).catch((err) => {
                        console.error('Failed to refresh token after expiration', err);
                        setAuthenticated(false);
                        setToken(undefined);
                    });
                };

                refreshIntervalId = window.setInterval((): void => {
                    void keycloakClient
                        .updateToken(60)
                        .then((refreshed: boolean) => {
                            if (refreshed && !isCancelled) {
                                setToken(keycloakClient.token ?? undefined);
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

    const login = (): void => {
        void keycloakClient.login();
    };

    const logout = (): void => {
        const redirectUri = typeof window !== 'undefined' ? window.location.origin : undefined;
        if (redirectUri !== undefined) {
            void keycloakClient.logout({ redirectUri });
            return;
        }
        void keycloakClient.logout();
    };

    return <AuthContext.Provider value={{ initialized, authenticated, token, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
