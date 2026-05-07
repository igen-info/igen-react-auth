import Keycloak, { type KeycloakConfig, type KeycloakInitOptions } from 'keycloak-js';
import { type FC, type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type AuthClient, type AuthState, createAuthClient } from './core.js';

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

type AuthProviderKeycloakProps = {
    keycloak: Keycloak;
    config?: never;
};

type AuthProviderConfigProps = {
    config: KeycloakConfig;
    keycloak?: never;
};

export type AuthProviderProps = (AuthProviderKeycloakProps | AuthProviderConfigProps) & {
    children: ReactNode;
    initOptions?: KeycloakInitOptions;
    /**
     * How often (in seconds) the token refresh should be attempted.
     * Defaults to 30 seconds.
     */
    refreshIntervalSeconds?: number;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapStateToContext = (state: AuthState, authClient: AuthClient): AuthContextValue => {
    return {
        initialized: state.initialized,
        authenticated: state.authenticated,
        token: state.token,
        keycloak: state.keycloak,
        error: state.error,
        login: (): void => authClient.login(),
        logout: (): void => authClient.logout(),
    };
};

const withOptionalClientOptions = (
    initOptions: KeycloakInitOptions | undefined,
    refreshIntervalSeconds: number | undefined,
): { initOptions?: KeycloakInitOptions; refreshIntervalSeconds?: number } => {
    const clientOptions: { initOptions?: KeycloakInitOptions; refreshIntervalSeconds?: number } = {};

    if (initOptions !== undefined) {
        clientOptions.initOptions = initOptions;
    }

    if (refreshIntervalSeconds !== undefined) {
        clientOptions.refreshIntervalSeconds = refreshIntervalSeconds;
    }

    return clientOptions;
};

export const AuthProvider: FC<AuthProviderProps> = ({ children, keycloak, config, initOptions, refreshIntervalSeconds }) => {
    const authClient = useMemo((): AuthClient => {
        const clientOptions = withOptionalClientOptions(initOptions, refreshIntervalSeconds);

        if (keycloak !== undefined) {
            return createAuthClient({ keycloak, ...clientOptions });
        }

        if (config !== undefined) {
            return createAuthClient({ config, ...clientOptions });
        }

        throw new Error('AuthProvider requires either a pre-built Keycloak instance or a config object.');
    }, [keycloak, config, initOptions, refreshIntervalSeconds]);

    const [value, setValue] = useState<AuthContextValue>(() => mapStateToContext(authClient.getState(), authClient));

    useEffect((): (() => void) => {
        const unsubscribe = authClient.subscribe((state: AuthState): void => {
            setValue(mapStateToContext(state, authClient));
        });

        void authClient.init();

        return (): void => {
            unsubscribe();
            authClient.destroy();
        };
    }, [authClient]);

    const login = useCallback((): void => {
        authClient.login();
    }, [authClient]);

    const logout = useCallback((): void => {
        authClient.logout();
    }, [authClient]);

    const contextValue = useMemo(
        (): AuthContextValue => ({
            ...value,
            login,
            logout,
        }),
        [value, login, logout],
    );

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};
