(function(globalObject) {
	// TODO: Not sure if that will work once packaged in Electron
	const sandboxProxy = require('../lib/services/plugin_service/sandboxProxy.js').default;
	const ipcRenderer = require('electron').ipcRenderer;

	const urlParams = new URLSearchParams(window.location.search);
	const pluginId = urlParams.get('pluginId');

	let callbackId_ = 1;
	const callbacks_ = {};

	function mapFunctionsToCallbacks(arg) {
		if (Array.isArray(arg)) {
			for (let i = 0; i < arg.length; i++) {
				arg[i] = mapFunctionsToCallbacks(arg[i]);
			}
			return arg;
		} else if (typeof arg === 'function') {
			const id = `__event#${callbackId_}`;
			callbackId_++;
			callbacks_[id] = arg;
			return id;
		} else if (arg === null) {
			return null;
		} else if (arg === undefined) {
			return undefined;
		} else if (typeof arg === 'object') {
			for (const n in arg) {
				arg[n] = mapFunctionsToCallbacks(arg[n]);
			}
		}

		return arg;
	}

	const target = (path, args) => {
		ipcRenderer.send('pluginMessage', { target: 'mainWindow', pluginId: pluginId, path: path, args: mapFunctionsToCallbacks(args) });
	};

	globalObject.joplin = sandboxProxy(target);
})(window);
