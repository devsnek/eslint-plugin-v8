'use strict';

const espree = require('espree');
const walk = require('acorn/dist/walk');
const ruleComposer = require('eslint-rule-composer');
const eslint = require('eslint');
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

exports.parse = (code, options) => {
  const replacements = new Set();

  code = getMacros(code).source;

  code = code.replace(/%(.+?)\(/g, (_, name) => {
    replacements.add(`$${name}`);
    return `$${name}(`;
  });

  const ast = espree.parse(code, options);

  walk.simple(ast, {
    CallExpression(node) {
      if (replacements.has(node.callee.name))
        node.callee.name = `%${node.callee.name.slice(1)}`;
    },
  });

  return ast;
};

exports.rules = {
  'no-undef': ruleComposer.filterReports(new eslint.Linter().getRules().get('no-undef'), ({ node }, metadata) => {
    if (/^%/.test(node.name))
      return false;
    const { macros, defines } = getMacros(metadata.sourceCode.text, metadata.sourceCode);
    const keys = [...Object.keys(macros), ...Object.keys(defines)];
    return !keys.includes(node.name);
  }),
};
