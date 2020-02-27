/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

let shim = {};

shim.isNode = () => {
	if (typeof process === 'undefined') return false;
	if (shim.isElectron()) return true;
	return process.title == 'node';
};

shim.isReactNative = () => {
	if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('ReactNativeDebugger') >= 0) {
		return true;
	}

	return !shim.isNode();
};

shim.isLinux = () => {
	return process && process.platform === 'linux';
};

shim.isFreeBSD = () => {
	return process && process.platform === 'freebsd';
};

shim.isWindows = () => {
	return process && process.platform === 'win32';
};

shim.isMac = () => {
	return process && process.platform === 'darwin';
};

shim.platformName = function() {
	if (shim.isReactNative()) return shim.mobilePlatform();
	if (shim.isMac()) return 'darwin';
	if (shim.isWindows()) return 'win32';
	if (shim.isLinux()) return 'linux';
	if (shim.isFreeBSD()) return 'freebsd';
	if (process && process.platform) return process.platform;
	throw new Error('Cannot determine platform');
};

// "ios" or "android", or "" if not on mobile
shim.mobilePlatform = function() {
	return ''; // Default if we're not on mobile (React Native)
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
};

shim.isPortable = function() {
	return typeof process !== 'undefined' && typeof process.env === 'object' && !!process.env.PORTABLE_EXECUTABLE_DIR;
};

// Node requests can go wrong is so many different ways and with so
// many different error messages... This handler inspects the error
// and decides whether the request can safely be repeated or not.
shim.fetchRequestCanBeRetried = function(error) {
	if (!error) return false;

	// Unfortunately the error 'Network request failed' doesn't have a type
	// or error code, so hopefully that message won't change and is not localized
	if (error.message == 'Network request failed') return true;

	// request to https://public-ch3302....1fab24cb1bd5f.md failed, reason: socket hang up"
	if (error.code == 'ECONNRESET') return true;

	// OneDrive (or Node?) sometimes sends back a "not found" error for resources
	// that definitely exist and in this case repeating the request works.
	// Error is:
	// request to https://graph.microsoft.com/v1.0/drive/special/approot failed, reason: getaddrinfo ENOTFOUND graph.microsoft.com graph.microsoft.com:443
	if (error.code == 'ENOTFOUND') return true;

	// network timeout at: https://public-ch3302...859f9b0e3ab.md
	if (error.message && error.message.indexOf('network timeout') === 0) return true;

	// name: 'FetchError',
	// message: 'request to https://api.ipify.org/?format=json failed, reason: getaddrinfo EAI_AGAIN api.ipify.org:443',
	// type: 'system',
	// errno: 'EAI_AGAIN',
	// code: 'EAI_AGAIN' } } reason: { FetchError: request to https://api.ipify.org/?format=json failed, reason: getaddrinfo EAI_AGAIN api.ipify.org:443
	//
	// It's a Microsoft error: "A temporary failure in name resolution occurred."
	if (error.code == 'EAI_AGAIN') return true;

	// request to https://public-...8fd8bc6bb68e9c4d17a.md failed, reason: connect ETIMEDOUT 204.79.197.213:443
	// Code: ETIMEDOUT
	if (error.code === 'ETIMEDOUT') return true;

	// ECONNREFUSED is generally temporary
	if (error.code === 'ECONNREFUSED') return true;

	return false;
};

shim.fetchMaxRetry_ = 5;

shim.fetchMaxRetrySet = v => {
	const previous = shim.fetchMaxRetry_;
	shim.fetchMaxRetry_ = v;
	return previous;
};

shim.fetchWithRetry = async function(fetchFn, options = null) {
	const { time } = require('lib/time-utils.js');

	if (!options) options = {};
	if (!options.timeout) options.timeout = 1000 * 120; // ms
	if (!('maxRetry' in options)) options.maxRetry = shim.fetchMaxRetry_;

	let retryCount = 0;
	while (true) {
		try {
			const response = await fetchFn();
			return response;
		} catch (error) {
			if (shim.fetchRequestCanBeRetried(error)) {
				retryCount++;
				if (retryCount > options.maxRetry) throw error;
				await time.sleep(retryCount * 3);
			} else {
				throw error;
			}
		}
	}
};

shim.fetch = () => {
	throw new Error('Not implemented');
};
shim.FormData = typeof FormData !== 'undefined' ? FormData : null;
shim.fsDriver = () => {
	throw new Error('Not implemented');
};
shim.FileApiDriverLocal = null;

shim.readLocalFileBase64 = path => {
	throw new Error('Not implemented');
};

shim.uploadBlob = () => {
	throw new Error('Not implemented');
};

shim.sjclModule = null;

shim.randomBytes = async count => {
	throw new Error('Not implemented');
};

shim.setInterval = function(fn, interval) {
	return setInterval(fn, interval);
};

shim.clearInterval = function(id) {
	return clearInterval(id);
};

shim.stringByteLength = function(string) {
	throw new Error('Not implemented');
};

shim.detectAndSetLocale = null;

shim.attachFileToNote = async (note, filePath) => {};

shim.imageFromDataUrl = async function(imageDataUrl, filePath) {
	throw new Error('Not implemented');
};
shim.Buffer = null;
shim.openUrl = () => {
	throw new Error('Not implemented');
};
shim.httpAgent = () => {
	throw new Error('Not implemented');
};
shim.openOrCreateFile = () => {
	throw new Error('Not implemented');
};
shim.waitForFrame = () => {
	throw new Error('Not implemented');
};

shim.appVersion = () => {
	throw new Error('Not implemented');
};

shim.injectedJs = name => '';

let isTestingEnv_ = false;

shim.isTestingEnv = () => {
	return isTestingEnv_;
};

shim.setIsTestingEnv = (v) => {
	isTestingEnv_ = v;
};

module.exports = { shim };
