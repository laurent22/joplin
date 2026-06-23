# Joplin Server hardening

Node.js provides several hardening options, which can reduce attack surface and make it more difficult to exploit certain types of vulnerabilities.

If Joplin Server hardening is enabled, certain supported Node.js hardening options are enabled on startup. This feature is currently opt-in by setting `JOPLIN_HARDENING_LEVEL=1`.

## How it works

Joplin Server's main entrypoint, `index.ts` calls a secondary entrypoint (`app.ts`) with certain [`NODE_OPTIONS`](https://nodejs.org/api/cli.html#options) set. If hardening is enabled, these `NODE_OPTIONS` currently include:
- [`--disable-proto=delete`](https://nodejs.org/api/cli.html#disable-protomode): Removes the deprecated `__proto__` property. This makes [prototype pollution](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution) attacks more difficult.
- [`--disallow-code-generation-from-strings`](https://nodejs.org/api/cli.html#disallow-code-generation-from-strings): Disables `eval` and the `new Function` constructor.

