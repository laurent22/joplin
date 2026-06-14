// Native ESM dynamic import that survives both TypeScript's CommonJS lowering
// and the renderer's strict CSP (no `new Function`, no `eval`). Lives in a .js
// file because tsc would otherwise rewrite the import() call to require(),
// which can't load ESM-only packages like @xenova/transformers.

module.exports = function dynamicEsmImport(specifier) {
	return import(specifier);
};
