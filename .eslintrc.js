module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:adonis/typescriptPackage'
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/semi': [2, 'always'],
    'no-multi-spaces': [
      'error', {
        'exceptions': {
          'VariableDeclarator': true,
          'AssignmentExpression': true
        }
      }
    ],
    '@typescript-eslint/naming-convention': [
      'error', {
        'selector': 'interface',
        'format': ['PascalCase'],
        'prefix': ['I'],
      }
    ],
  },
};
