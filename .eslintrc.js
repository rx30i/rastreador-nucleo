module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'google'
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
    'max-len': ['error', { 'comments': 120, 'code': 120 }],
    'key-spacing': ['error', {'align': 'colon'}],
    'require-jsdoc': 'off',
    'indent': ['error', 2],
    '@typescript-eslint/no-unused-vars': ['error',
      {
        'caughtErrors': 'all',
        'caughtErrorsIgnorePattern': '^_',
        'destructuredArrayIgnorePattern': '^_',
      }
    ],
    'no-multi-spaces': ['error',
      {
        ignoreEOLComments: true,
        exceptions: {
          VariableDeclarator: true,
          AssignmentExpression: true }
      }
    ]
  },
};
