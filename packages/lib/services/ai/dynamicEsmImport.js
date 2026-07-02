// Loads ESM-only packages (e.g. @xenova/transformers) from this CJS module.
// Why this exists:
// - `await import()` gets lowered to require() by tsc under module:commonjs,
//   which can't load ESM.
// - `new Function('import(...)')` is blocked by the renderer's CSP.
// - `import()` from a .js file uses the browser loader in the renderer,
//   which can't resolve bare specifiers (e.g. transitive @huggingface/jinja).
// Node's require() since 22.12 loads ESM transparently using Node's resolver
// and works in both processes. engines.node enforces the 22.12+ floor.
module.exports = function dynamicEsmImport(specifier) {
	return Promise.resolve(require(specifier));
};
