'use strict';

const walk = require('acorn/dist/walk');
const ruleComposer = require('eslint-rule-composer');
const eslint = require('eslint');
const babel = require('babel-eslint');
const fs = require('fs');

const parseMacros = require('./macros');

let baseMacros;
const getMacros = (source, key) => {
  const out = parseMacros(source, key);

  if (baseMacros === undefined) {
    baseMacros = { defines: {}, macros: {} };
    if (Array.isArray(module.exports.macroFiles)) {
      for (const name of exports.macroFiles) {
        const o = parseMacros(fs.readFileSync(name, 'utf8'), name);
        Object.assign(baseMacros.defines, o.defines);
        Object.assign(baseMacros.macros, o.macros);
      }
    }
  }

  return {
    defines: { ...out.defines, ...baseMacros.defines },
    macros: { ...out.macros, ...baseMacros.macros },
    source: out.source,
  };
};

const parseForESLint = (code, options) => {
  const replacements = new Set();

  code = getMacros(code).source;

  code = code.replace(/%([a-zA-Z_]+?)\(/g, (_, name) => {
    replacements.add(`$${name}`);
    return `$${name}(`;
  });

  const parsed = babel.parseForESLint(code, options);

  walk.simple(parsed.ast, {
    CallExpression(node) {
      if (replacements.has(node.callee.name))
        node.callee.name = `%${node.callee.name.slice(1)}`;
    },
  }, {
    ...walk.base,
    Import() { return undefined; },
    ExperimentalSpreadProperty() { return undefined; },
    BigIntLiteral() { return undefined; },
    MetaProperty() { return undefined; },
  });

  return parsed;
};

module.exports = {
  macroFiles: undefined,
  parseForESLint,
  parse: (code, options) => parseForESLint(code, options).ast,
  rules: {
    'no-undef': ruleComposer.filterReports(
      new eslint.Linter().getRules().get('no-undef'),
      ({ node }, { sourceCode }) => {
        if (/^%/.test(node.name))
          return false;
        if (!/%|macro|define/.test(sourceCode.text))
          return true;
        const { macros, defines } = getMacros(sourceCode.text, sourceCode);
        const keys = [...Object.keys(macros), ...Object.keys(defines)];
        return !keys.includes(node.name);
      }),
  },
};
