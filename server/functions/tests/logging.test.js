/* global describe, expect, test */

const fs = require('fs');
const path = require('path');
const { Linter } = require('eslint');

describe('structured error logging', () => {
  test('application logs do not use Firebase logger reserved message metadata', () => {
    const linter = new Linter();
    linter.defineRule('no-reserved-log-message', {
      create: (context) => ({
        CallExpression: (node) => {
          if (node.callee.type !== 'MemberExpression' ||
            node.callee.object.name !== 'logger') return;
          for (const argument of node.arguments.slice(1)) {
            if (argument.type !== 'ObjectExpression') continue;
            for (const property of argument.properties) {
              if ((property.key?.name || property.key?.value) === 'message') {
                context.report({
                  node: property, message: 'Use errorMessage; message is reserved by Firebase logger.',
                });
              }
            }
          }
        },
      }),
    });
    const failures = [];
    for (const directory of ['endpoints', 'integrations', 'services', 'middleware']) {
      const root = path.join(__dirname, '..', directory);
      for (const file of fs.readdirSync(root, { recursive: true })) {
        if (!file.endsWith('.js')) continue;
        const errors = linter.verify(fs.readFileSync(path.join(root, file), 'utf8'), {
          parserOptions: { ecmaVersion: 2022 },
          rules: { 'no-reserved-log-message': 'error' },
        });
        failures.push(...errors.map((error) => `${directory}/${file}:${error.line} ${error.message}`));
      }
    }
    expect(failures).toEqual([]);
  });
});
