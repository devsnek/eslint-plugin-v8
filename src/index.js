'use strict';

const walk = require('acorn/dist/walk');
const ruleComposer = require('eslint-rule-composer');
const eslint = require('eslint');
const fs = require('fs');
const parseMacros = require('./macros');

const config = {
  parser: undefined,
  macroFiles: undefined,
};

module.exports = (c) => {
  Object.assign(config, c);
};

let baseMacros;
const getMacros = (source, key) => {
  const out = parseMacros(source, key);

  if (baseMacros === undefined) {
    baseMacros = { defines: {}, macros: {} };
    if (Array.isArray(config.macroFiles)) {
      for (const name of config.macroFiles) {
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

let parse;
const getParser = () => {
  if (parse !== undefined)
    return parse;

  if (config.parser) {
    const p = require(config.parser);
    parse = p.parseForESLint || p.parse;
  } else {
    parse = require('espree').parse;
  }

  return parse;
};

const parseForESLint = (code, options) => {
  const replacements = new Set();

  code = getMacros(code).source;

  code = code.replace(/%([a-zA-Z_]+?)\(/g, (_, name) => {
    replacements.add(`$${name}`);
    return `$${name}(`;
  });


  const parsed = getParser()(code, options);
  const ast = parsed.ast || parsed;

  walk.simple(ast, {
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

  return { ast };
};

Object.assign(module.exports, {
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
});
