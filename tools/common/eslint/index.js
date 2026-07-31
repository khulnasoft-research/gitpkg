import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default function createConfig(rootDir = process.cwd()) {
  return [
    {
      ignores: ['node_modules/', 'dist/', 'build/', 'coverage/']
    },
    eslintJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          project: true,
          tsconfigRootDir: rootDir,
        }
      },
      plugins: {
        '@typescript-eslint': tseslint.plugin,
        prettier: prettierPlugin,
      },
      rules: {
        ...tseslint.configs.recommended.rules,
        ...tseslint.configs['recommended-requiring-type-checking'].rules,
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { 
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }],
        'prettier/prettier': 'warn',
      }
    },
    {
      files: ['**/*.js', '**/*.cjs'],
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'prettier/prettier': 'warn',
      }
    },
    prettier,
    {
      plugins: {
        prettier: prettierPlugin,
      },
      rules: {
        'prettier/prettier': 'warn'
      }
    }
  ];
}
