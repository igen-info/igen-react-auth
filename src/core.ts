import Keycloak, { type KeycloakConfig, type KeycloakInitOptions, type KeycloakLoginOptions, type KeycloakTokenParsed } from 'keycloak-js';

/**
 * Extended interface to include common Keycloak fields that are not in the default typings.
 */
export interface ExtendedKeycloakToken extends KeycloakTokenParsed {
    preferred_username?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    roles?: string[];
}

export type AuthState = {
    initialized: boolean;
    authenticated: boolean;
    token: string | undefined;
    keycloak: Keycloak;
    error: Error | undefined;
};

export type AuthStateListener = (state: AuthState) => void;

type AuthClientKeycloakOptions = {
    keycloak: Keycloak;
    config?: never;
};

type AuthClientConfigOptions = {
    config: KeycloakConfig;
    keycloak?: never;
};

export type AuthClientOptions = (AuthClientKeycloakOptions | AuthClientConfigOptions) & {
    initOptions?: KeycloakInitOptions;
    /**
     * How often (in seconds) the token refresh should be attempted.
     * Defaults to 30 seconds.
     */
    refreshIntervalSeconds?: number;
};

export type AuthClient = {
    init: () => Promise<AuthState>;
    getState: () => AuthState;
    subscribe: (listener: AuthStateListener) => () => void;
    login: (options?: KeycloakLoginOptions) => void;
    logout: () => void;
    refresh: (minValidity?: number) => Promise<boolean>;
    destroy: () => void;
};

const DEFAULT_REFRESH_INTERVAL_SECONDS = 30;
const TOKEN_EXPIRED_REFRESH_MIN_VALIDITY_SECONDS = 30;
const INTERVAL_REFRESH_MIN_VALIDITY_SECONDS = 60;

/**
 * Creates a Keycloak instance.
 */
export const createKeycloakClient = (config: KeycloakConfig): Keycloak => {
    return new Keycloak(config);
};

const resolveInitOptions = (initOptions: KeycloakInitOptions | undefined): KeycloakInitOptions => {
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
};

const toError = (err: unknown, fallbackMessage: string): Error => {
    if (err instanceof Error) {
        return err;
    }

    return new Error(fallbackMessage);
};

class KeycloakAuthClient implements AuthClient {
    private readonly keycloak: Keycloak;
    private readonly initOptions: KeycloakInitOptions;
    private readonly refreshIntervalSeconds: number;
    private readonly listeners = new Set<AuthStateListener>();
    private state: AuthState;
    private initPromise: Promise<AuthState> | undefined;
    private refreshIntervalId: number | undefined;
    private destroyed = false;

    public constructor(options: AuthClientOptions) {
        if (options.keycloak !== undefined && options.config !== undefined) {
            throw new Error('createAuthClient requires either a pre-built Keycloak instance or a config object, not both.');
        }

        if (options.keycloak === undefined && options.config === undefined) {
            throw new Error('createAuthClient requires either a pre-built Keycloak instance or a config object.');
        }

        this.keycloak = options.keycloak ?? createKeycloakClient(options.config);
        this.initOptions = resolveInitOptions(options.initOptions);
        this.refreshIntervalSeconds = options.refreshIntervalSeconds ?? DEFAULT_REFRESH_INTERVAL_SECONDS;
        this.state = {
            initialized: false,
            authenticated: false,
            token: undefined,
            keycloak: this.keycloak,
            error: undefined,
        };
    }

    public init(): Promise<AuthState> {
        this.destroyed = false;

        if (this.initPromise !== undefined) {
            return this.initPromise;
        }

        this.initPromise = this.keycloak
            .init(this.initOptions)
            .then((authenticated: boolean): AuthState => {
                if (this.destroyed) {
                    return this.state;
                }

                this.bindKeycloakEvents();
                this.setState({
                    initialized: true,
                    authenticated,
                    token: this.keycloak.token ?? undefined,
                    error: undefined,
                });
                this.startRefreshInterval();

                return this.state;
            })
            .catch((err: unknown): AuthState => {
                console.error('Keycloak init error', err);
                this.setState({
                    initialized: true,
                    authenticated: false,
                    token: undefined,
                    error: toError(err, 'Keycloak failed to initialize'),
                });

                return this.state;
            });

        return this.initPromise;
    }

    public getState(): AuthState {
        return this.state;
    }

    public subscribe(listener: AuthStateListener): () => void {
        this.listeners.add(listener);
        listener(this.state);

        return (): void => {
            this.listeners.delete(listener);
        };
    }

    public login(options?: KeycloakLoginOptions): void {
        void this.keycloak.login(options);
    }

    public logout(): void {
        if (typeof window !== 'undefined') {
            void this.keycloak.logout({ redirectUri: window.location.origin });
            return;
        }

        void this.keycloak.logout();
    }

    public refresh(minValidity = INTERVAL_REFRESH_MIN_VALIDITY_SECONDS): Promise<boolean> {
        return this.keycloak
            .updateToken(minValidity)
            .then((refreshed: boolean): boolean => {
                if (refreshed) {
                    this.setState({
                        token: this.keycloak.token ?? undefined,
                        error: undefined,
                    });
                }

                return refreshed;
            })
            .catch((err: unknown): never => {
                console.error('Failed to refresh token', err);
                this.setState({
                    error: toError(err, 'Keycloak token refresh failed'),
                });
                throw err;
            });
    }

    public destroy(): void {
        this.destroyed = true;

        if (this.refreshIntervalId !== undefined) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = undefined;
        }

        this.listeners.clear();
    }

    private bindKeycloakEvents(): void {
        this.keycloak.onAuthSuccess = (): void => {
            this.setState({
                authenticated: true,
                token: this.keycloak.token ?? undefined,
                error: undefined,
            });
        };

        this.keycloak.onAuthLogout = (): void => {
            this.setState({
                authenticated: false,
                token: undefined,
            });
        };

        this.keycloak.onAuthRefreshSuccess = (): void => {
            this.setState({
                token: this.keycloak.token ?? undefined,
                error: undefined,
            });
        };

        this.keycloak.onTokenExpired = (): void => {
            void this.refresh(TOKEN_EXPIRED_REFRESH_MIN_VALIDITY_SECONDS).catch((): void => {
                this.setState({
                    authenticated: false,
                    token: undefined,
                });
            });
        };
    }

    private startRefreshInterval(): void {
        if (typeof window === 'undefined' || this.refreshIntervalId !== undefined) {
            return;
        }

        this.refreshIntervalId = window.setInterval((): void => {
            void this.refresh().catch((): void => {
                // The error state is already captured by refresh().
            });
        }, this.refreshIntervalSeconds * 1000);
    }

    private setState(nextState: Partial<Omit<AuthState, 'keycloak'>>): void {
        this.state = {
            ...this.state,
            ...nextState,
        };

        this.listeners.forEach((listener: AuthStateListener): void => {
            listener(this.state);
        });
    }
}

export const createAuthClient = (options: AuthClientOptions): AuthClient => {
    return new KeycloakAuthClient(options);
};

/**
 * Extracts the username (preferred_username) from the token.
 */
export const getUsername = (keycloak: Keycloak | undefined): string | undefined => {
    return (keycloak?.tokenParsed as ExtendedKeycloakToken)?.preferred_username;
};

/**
 * Extracts the full name from the token.
 */
export const getFullName = (keycloak: Keycloak | undefined): string | undefined => {
    return (keycloak?.tokenParsed as ExtendedKeycloakToken)?.name;
};

/**
 * Checks if the user has a specific role (Realm or Client).
 */
export const hasRole = (keycloak: Keycloak | undefined, role: string): boolean => {
    if (!keycloak) return false;
    return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role);
};

/**
 * Checks if the token has expired or is about to expire.
 * @param minValidity Seconds of leeway to consider the token expired.
 */
export const isTokenExpired = (keycloak: Keycloak | undefined, minValidity = 5): boolean => {
    if (!keycloak) return true;
    return keycloak.isTokenExpired(minValidity);
};
