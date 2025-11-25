import * as js from '@eslint/js';
import * as globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        ignores: ['dist/**'],
    },
    {
        files: ['src/**/*.{js,mjs,cjs}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.node },
        rules: { semi: ['error', 'always'] },
    },
    {
        files: ['src/**/*.{ts,mts,cts}'],
        extends: tseslint.configs.recommendedTypeChecked,
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            semi: ['error', 'always'],
            '@typescript-eslint/strict-boolean-expressions': ['error', { allowString: false, allowNumber: false }],
            '@typescript-eslint/explicit-function-return-type': 'error',
        },
    },
    {
        files: ['src/**/*.{jsx,tsx}'],
        extends: [tseslint.configs.recommendedTypeChecked, pluginReact.configs.flat.recommended],
        languageOptions: {
            globals: globals.browser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            semi: ['error', 'always'],
            '@typescript-eslint/strict-boolean-expressions': ['error', { allowString: false, allowNumber: false }],
            '@typescript-eslint/explicit-function-return-type': 'error',
            'react/react-in-jsx-scope': 'off',
        },
    },
]);
