# eslint-plugin-v8

Enables parsing of v8 natives syntax such as `%PromiseStatus()`, and macros, such as `macro IS_ARRAY(arg) = (%IsJSArray(arg));` or `define UNDEFINED = (void 0);`.


# example eslintrc.js
```js
require('eslint-plugin-v8', {
  macroFiles: [/* files with shared macros */],
  parser: 'optional parent parser to use such as babel-eslint'
});

module.exports = {
  'parser': 'eslint-plugin-v8',
  'plugins': ['v8'],

  'no-undef': 'off',
  'v8/no-undef': 'error',
}
```
