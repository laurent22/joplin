let shim = {};

shim.isNode = () => {
	if (typeof process === 'undefined') return false;
	return process.title == 'node';
};

shim.isReactNative = () => {
	return !shim.isNode();
};

shim.fetch = typeof fetch !== 'undefined' ? fetch : null;
shim.FormData = typeof FormData !== 'undefined' ? FormData : null;
shim.fs = null;
shim.FileApiDriverLocal = null;
shim.readLocalFileBase64 = (path) => { throw new Error('Not implemented'); }
shim.uploadBlob = () => { throw new Error('Not implemented'); }
shim.setInterval = function(fn, interval) {
	return setInterval(fn, interval);
}
shim.clearInterval = function(id) {
	return clearInterval(id);
}
shim.detectAndSetLocale = null;

module.exports = { shim };