# Joplin Server hardening

Joplin Server enables one or more hardening options provided by Node.js. These options reduce attack surface and make it more difficult to exploit certain types of vulnerabilities.

## How it works

Joplin Server's main entrypoint, `index.ts` calls a secondary entrypoint (`app.ts`) with certain [`NODE_OPTIONS`](https://nodejs.org/api/cli.html#options) set. If hardening is enabled, these `NODE_OPTIONS` currently include:
- [`--disable-proto=delete`](https://nodejs.org/api/cli.html#disable-protomode): Removes the deprecated `__proto__` property. This makes [prototype pollution](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution) attacks [more difficult](https://github.com/nodejs/node/issues/31951).

