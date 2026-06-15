// Loads an ESM-only package from a CommonJS context.
//
// Tried approaches:
// 1. `new Function('import(...)')` — blocked by the renderer's CSP
//    (unsafe-eval forbidden).
// 2. `await import(specifier)` — TypeScript lowers this to `require()` under
//    `module: commonjs`, which can't load ESM.
// 3. `import(specifier)` from a .js file — works in Node, but in Electron's
//    renderer the import() goes through the browser's module loader, which
//    can't resolve bare specifiers or transitive node_modules imports
//    (e.g. transformers.js pulling @huggingface/jinja).
//
// The reliable path is Node's own `require()`, which since 22.12 supports
// loading ESM modules (`require(esm)`) and always uses Node's resolver. This
// works in both the main and renderer processes when nodeIntegration is on.
// The repo's engines.node enforces the 22.12+ requirement at install time.
module.exports = function dynamicEsmImport(specifier) {
	return Promise.resolve(require(specifier));
};
