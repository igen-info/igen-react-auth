import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, createKeycloakClient, useAuth } from '@auth';

const keycloak = createKeycloakClient({
    url: 'https://auth.igen.local/auth', // TODO: update to your Keycloak URL
    realm: 'Igen', // TODO: update to your realm
    clientId: 'react-auth-demo', // TODO: update to your client id
});

const Demo = () => {
    const { initialized, authenticated, token, login, logout } = useAuth();

    if (!initialized) {
        return <div>Initializing authentication...</div>;
    }

    return (
        <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 640, margin: '2rem auto', lineHeight: 1.5 }}>
            <h1>Keycloak Auth Demo</h1>
            <p>
                Update the Keycloak config in <code>demo/src/main.tsx</code> and start the dev server.
            </p>
            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
                <div>
                    <strong>Authenticated:</strong> {authenticated ? 'Yes' : 'No'}
                </div>
                <div style={{ marginTop: 8 }}>
                    <strong>Token:</strong>{' '}
                    {token ? <code style={{ display: 'inline-block', wordBreak: 'break-all' }}>{token.slice(0, 32)}...</code> : 'none'}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button type="button" onClick={login} disabled={authenticated} style={{ padding: '0.5rem 1rem' }}>
                        Login
                    </button>
                    <button type="button" onClick={logout} disabled={!authenticated} style={{ padding: '0.5rem 1rem' }}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider keycloak={keycloak}>{<Demo />}</AuthProvider>
    </StrictMode>,
);
