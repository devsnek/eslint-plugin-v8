'use strict';

const CONST_PATTERN = /^define\s+([a-zA-Z0-9_]+)\s*=\s*([^;]*);$/mg;
const INLINE_MACRO_PATTERN = /^macro\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*=\s*([^;]*);$/mg;
const MACRO_PATTERN = /^macro\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\n(.*)\nendmacro$/mg;

const parseCache = new Map();

function parse(source, key) {
  const defines = {};
  const macros = {};

  if (key && parseCache.has(key))
    return parseCache.get(key);

  source = source.toString();

  CONST_PATTERN.lastIndex = 0;
  source = source.replace(CONST_PATTERN, (_, name, val) => {
    defines[name] = val;
    return `// DEF ${name} = ${val};`;
  });

  INLINE_MACRO_PATTERN.lastIndex = 0;
  source = source.replace(INLINE_MACRO_PATTERN, (_, name, args, body) => {
    args = args.split(', ').map((a) => a.trim());
    macros[name] = {
      args,
      body,
    };
    return `// MC ${name}(${args.join(', ')}) = ${body};`;
  });

  MACRO_PATTERN.lasIndex = 0;
  source = source.replace(MACRO_PATTERN, (_, name, args, body) => {
    args = args.split(', ').map((a) => a.trim());
    macros[name] = {
      args,
      body,
    };
    return `/* MC ${name}(${args.join(', ')})\n${body}\nENDMC */`;
  });

  if (key)
    parseCache.set(key, { defines, macros, source });

  return { defines, macros, source };
}

module.exports = parse;
