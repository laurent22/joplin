// Our TypeScript config generates files that use CommonJS `export`s, which
// aren't defined in a browser.
//
// While this is (somehow) fine in Chrome, it breaks the extension in Firefox.
// We thus define window.exports:
window.exports ??= {};
