import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, createKeycloakClient, useAuth } from '../../src/index';

const validConfig = {
    url: 'https://auth.igen.local/auth',
    realm: 'Igen',
    clientId: 'react-auth-demo',
};

const invalidConfig = {
    url: 'https://invalid-url.local/auth',
    realm: 'Invalid',
    clientId: 'invalid-client',
};

const Demo = ({ onSimulateError }: { onSimulateError: () => void }) => {
    const { initialized, authenticated, token, keycloak, error, login, logout } = useAuth();

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorCard}>
                    <h2 style={{ marginTop: 0 }}>Authentication Error</h2>
                    <p>{error.message}</p>
                    <button type="button" onClick={() => window.location.reload()} style={styles.buttonPrimary}>
                        Retry / Reload
                    </button>
                </div>
            </div>
        );
    }

    if (!initialized) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Initializing Keycloak...</p>
                </div>
            </div>
        );
    }

    const username = (keycloak?.tokenParsed as any)?.preferred_username || 'Guest';
    const fullName = (keycloak?.tokenParsed as any)?.name;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1>Keycloak Auth Demo</h1>
                {authenticated && (
                    <div style={styles.userBadge}>
                        <div style={styles.avatar}>{username[0].toUpperCase()}</div>
                        <div>
                            <div style={styles.username}>{fullName || username}</div>
                            <div style={styles.role}>Authenticated User</div>
                        </div>
                    </div>
                )}
            </header>

            <main style={styles.card}>
                <section style={styles.section}>
                    <div style={styles.statusRow}>
                        <strong>Status:</strong>
                        <span
                            style={{
                                ...styles.badge,
                                backgroundColor: authenticated ? '#e6fffa' : '#fff5f5',
                                color: authenticated ? '#2c7a7b' : '#c53030',
                            }}
                        >
                            {authenticated ? 'Authenticated' : 'Not Logged In'}
                        </span>
                    </div>

                    {authenticated && (
                        <div style={styles.infoBox}>
                            <div style={{ marginBottom: 8 }}>
                                <strong>Username:</strong> {username}
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <strong>Token (truncated):</strong>
                            </div>
                            <code style={styles.code}>{token?.slice(0, 48)}...</code>
                        </div>
                    )}
                </section>

                <footer style={styles.actions}>
                    {!authenticated ? (
                        <button type="button" onClick={login} style={styles.buttonPrimary}>
                            Login to Account
                        </button>
                    ) : (
                        <button type="button" onClick={logout} style={styles.buttonSecondary}>
                            Logout
                        </button>
                    )}
                    <button type="button" onClick={onSimulateError} style={styles.buttonGhost}>
                        Simulate Config Error
                    </button>
                </footer>
            </main>
        </div>
    );
};

const App = () => {
    const [config, setConfig] = useState(validConfig);

    return (
        <AuthProvider keycloak={createKeycloakClient(config)} key={config.url}>
            <Demo onSimulateError={() => setConfig(invalidConfig)} />
        </AuthProvider>
    );
};

const styles = {
    container: {
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        maxWidth: '600px',
        margin: '4rem auto',
        padding: '0 20px',
        color: '#2d3748',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
    },
    errorCard: {
        backgroundColor: '#fff5f5',
        color: '#c53030',
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid #feb2b2',
        textAlign: 'center' as const,
    },
    section: {
        padding: '2rem',
    },
    statusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '1.5rem',
    },
    badge: {
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 600,
    },
    infoBox: {
        backgroundColor: '#f7fafc',
        padding: '1rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
    },
    code: {
        display: 'block',
        backgroundColor: '#edf2f7',
        padding: '8px',
        borderRadius: '4px',
        wordBreak: 'break-all' as const,
        fontSize: '0.8rem',
        fontFamily: 'monospace',
    },
    actions: {
        display: 'flex',
        gap: '12px',
        padding: '1.25rem 2rem',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
    },
    buttonPrimary: {
        backgroundColor: '#4299e1',
        color: 'white',
        border: 'none',
        padding: '0.6rem 1.2rem',
        borderRadius: '6px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    buttonSecondary: {
        backgroundColor: '#718096',
        color: 'white',
        border: 'none',
        padding: '0.6rem 1.2rem',
        borderRadius: '6px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    buttonGhost: {
        backgroundColor: 'transparent',
        color: '#a0aec0',
        border: '1px solid #e2e8f0',
        padding: '0.6rem 1.2rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    userBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    avatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#4299e1',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
    },
    username: {
        fontWeight: 600,
        fontSize: '0.9rem',
    },
    role: {
        fontSize: '0.75rem',
        color: '#718096',
    },
    loading: {
        textAlign: 'center' as const,
        color: '#718096',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#4299e1',
        borderRadius: '50%',
        margin: '0 auto 1rem',
        animation: 'spin 1s linear infinite',
    },
};

// Adiciona animação de spin via JS para não precisar de arquivo CSS extra
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
