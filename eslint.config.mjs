import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            '.mastra/**',
            '.trellis/**',
            '.serena/**',
            '.opencode/**',
            '.sisyphus/**',
            '*.config.mjs',
            '*.config.ts',
            'next-env.d.ts',
        ],
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
                    message: '禁止直接使用十六进制颜色，请改用语义 token。',
                },
                {
                    selector:
                        'Literal[value=/\\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-[0-9]{2,3})?(?:\\/[0-9]{1,3})?/]',
                    message: '禁止使用色阶类或硬编码颜色，请改用语义 token。',
                },
            ],
        },
    },
    {
        files: [
            'src/features/auth/lib/email-templates.ts',
            'src/features/auth/components/google-sign-in-button.tsx',
            'src/features/shared/components/common/auth-modal.tsx',
            'src/app/[locale]/(main)/layout.tsx',
            'src/app/[locale]/(marketing)/main-page-client.tsx',
        ],
        rules: {
            'no-restricted-syntax': 'off',
        },
    },
);
