let shim = {};

shim.isNode = () => {
	if (typeof process === 'undefined') return false;
	return process.title = 'node';
};

shim.isReactNative = () => {
	return !shim.isNode();
};

shim.fetch = typeof fetch !== 'undefined' ? fetch : null;
shim.FormData = typeof FormData !== 'undefined' ? FormData : null;

if (!shim.fetch) {
	let moduleName = 'node-fetch';
	shim.fetch = require(moduleName);
}

if (!shim.FormData) {
	let moduleName = 'form-data';
	shim.FormData = require(moduleName);
}

export { shim };