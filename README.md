# eslint-plugin-v8

Enables parsing of v8 natives syntax such as `%PromiseStatus()`, and macros, such as `macro IS_ARRAY(arg) = (%IsJSArray(arg));` or `define UNDEFINED = (void 0);`.

```js
const v8 = require('eslint-plugin-v8');

v8.macroFiles = [/* files with shared macros */];

module.exports = {
  'parser': 'eslint-plugin-v8',
  'plugins': ['v8'],

  'no-undef': 'off',
  'v8/no-undef': 'error',
}
```
