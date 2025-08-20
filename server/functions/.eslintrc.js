module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  extends: ['eslint:recommended', 'google'],
  rules: {
    'require-jsdoc': 'off',
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'linebreak-style': 0,
    'object-curly-spacing': ['error', 'always'],
    'max-len': ['error', { code: 120 }],
    'indent': ['off', 6],
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
