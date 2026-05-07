import Keycloak, { type KeycloakConfig, type KeycloakTokenParsed } from 'keycloak-js';

/**
 * Interface estendida para incluir campos comuns do Keycloak que não estão na tipagem padrão.
 */
export interface ExtendedKeycloakToken extends KeycloakTokenParsed {
    preferred_username?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    roles?: string[];
}

/**
 * Cria uma instância do Keycloak.
 */
export const createKeycloakClient = (config: KeycloakConfig): Keycloak => {
    return new Keycloak(config);
};

/**
 * Extrai o username (preferred_username) do token.
 */
export const getUsername = (keycloak: Keycloak | undefined): string | undefined => {
    return (keycloak?.tokenParsed as ExtendedKeycloakToken)?.preferred_username;
};

/**
 * Extrai o nome completo do token.
 */
export const getFullName = (keycloak: Keycloak | undefined): string | undefined => {
    return (keycloak?.tokenParsed as ExtendedKeycloakToken)?.name;
};

/**
 * Verifica se o usuário possui uma role específica (Realm ou Client).
 */
export const hasRole = (keycloak: Keycloak | undefined, role: string): boolean => {
    if (!keycloak) return false;
    return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role);
};

/**
 * Verifica se o token expirou ou está prestes a expirar.
 * @param minValidity Segundos de folga para considerar expirado.
 */
export const isTokenExpired = (keycloak: Keycloak | undefined, minValidity = 5): boolean => {
    if (!keycloak) return true;
    return keycloak.isTokenExpired(minValidity);
};
