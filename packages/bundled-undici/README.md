## `@joplin/bundled-undici`

This package bundles [undici](https://undici.nodejs.org/) such that it can run successfully in Node.js environments with replaced globals (e.g. `jsdom`).

It works by adding `require` statements to the beginning of the bundled file that shadow the overridden globals. For example,
```js
const { setTimeout, setInterval, clearTimeout, clearInterval } = require('node:timers');
```
