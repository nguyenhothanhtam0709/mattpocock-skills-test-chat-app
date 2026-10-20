import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const bannedPackages = ['class-validator', 'class-transformer'];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '.scratch/**',
      '.agents/**',
      '.claude/**',
      'packages/web/src/components/ui/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Validation is Zod only (spec: one validation mechanism).
      'no-restricted-imports': [
        'error',
        {
          paths: bannedPackages.map((name) => ({
            name,
            message:
              'Use Zod schemas from @chat/contracts; class-validator/class-transformer are banned.',
          })),
          patterns: bannedPackages.map((name) => ({
            group: [`${name}/*`],
            message:
              'Use Zod schemas from @chat/contracts; class-validator/class-transformer are banned.',
          })),
        },
      ],
      // XSS is prevented at the render sink (ADR 0002).
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned: render user text as text (ADR 0002).',
        },
        {
          selector: "Property[key.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned: render user text as text (ADR 0002).',
        },
      ],
    },
  },
  {
    files: ['packages/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
);
