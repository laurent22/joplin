let shim = {};

shim.isNode = () => {
	if (typeof process === 'undefined') return false;
	if (shim.isElectron()) return true;
	return process.title == 'node';
};

shim.isReactNative = () => {
	return !shim.isNode();
};

// https://github.com/cheton/is-electron
shim.isElectron = () => {
    // Renderer process
    if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
        return true;
    }

    // Main process
    if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
        return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to true
    if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        return true;
    }

    return false;
}

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
shim.attachFileToNote = async (note, filePath) => {}

module.exports = { shim };