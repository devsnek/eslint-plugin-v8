'use strict';

const { tokTypes: tt, Parser: DefaultParser } = require('acorn');
const ruleComposer = require('eslint-rule-composer');
const eslint = require('eslint');

const Parser = DefaultParser.extend(() => class extends DefaultParser {
  parseMaybeUnary(refDestructuringErrors, sawUnary) {
    let native = false;
    if (this.type === tt.modulo) {
      this.eat(tt.modulo);
      native = true;
    }
    const node = super.parseMaybeUnary(refDestructuringErrors, sawUnary);
    if (native) {
      node.callee.name = `%${node.callee.name}`;
    }
    return node;
  }
});

const parseForESLint = (code, options) => {
  const ast = Parser.parse(code, options);
  return { ast };
};

module.exports = {
  parseForESLint,
  parse: (code, options) => parseForESLint(code, options).ast,
  rules: {
    'no-undef': ruleComposer.filterReports(
      new eslint.Linter().getRules().get('no-undef'),
      ({ node }) => /^%/.test(node.name),
    ),
    'no-natives-syntax': {
      meta: {
        docs: {
          description: 'disallow usage of natives syntax',
          category: 'Best Practices',
          recommended: true,
        },
      },
      create({ report }) {
        return {
          CallExpression(node) {
            if (!/^%/.test(node.callee.name)) {
              return;
            }
            report({
              node,
              message: `Unexpected natives syntax: ${node.callee.name}`,
            });
          },
        };
      },
    },
  },
};
