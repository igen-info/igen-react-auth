import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = resolve(__dirname);

export default defineConfig({
    root,
    plugins: [react()],
    resolve: {
        alias: {
            '@auth': resolve(root, '../src'),
        },
    },
    build: {
        outDir: resolve(root, 'dist'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
    },
});
