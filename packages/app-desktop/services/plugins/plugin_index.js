(function(globalObject) {
	// TODO: Not sure if that will work once packaged in Electron
	const sandboxProxy = require('../../vendor/lib/@joplin/lib/services/plugins/sandboxProxy.js');
	const ipcRenderer = require('electron').ipcRenderer;

	const ipcRendererSend = (message, args) => {
		try {
			return ipcRenderer.send(message, args);
		} catch (error) {
			console.error('Could not send IPC message:', message, ': ', args, error);
			throw error;
		}
	};

	const urlParams = new URLSearchParams(window.location.search);
	const pluginId = urlParams.get('pluginId');

	let eventId_ = 1;
	const eventHandlers_ = {};

	function mapEventHandlersToIds(argName, arg) {
		if (Array.isArray(arg)) {
			for (let i = 0; i < arg.length; i++) {
				arg[i] = mapEventHandlersToIds(`${i}`, arg[i]);
			}
			return arg;
		} else if (typeof arg === 'function') {
			const id = `___plugin_event_${argName}_${eventId_}`;
			eventId_++;
			eventHandlers_[id] = arg;
			return id;
		} else if (arg === null) {
			return null;
		} else if (arg === undefined) {
			return undefined;
		} else if (typeof arg === 'object') {
			for (const n in arg) {
				arg[n] = mapEventHandlersToIds(n, arg[n]);
			}
		}

		return arg;
	}

	const callbackPromises = {};
	let callbackIndex = 1;

	const target = (path, args) => {
		if (path === 'require' || path === 'plugins.require') { // plugins.require is deprecated
			const modulePath = args && args.length ? args[0] : null;
			if (!modulePath) throw new Error('No module path specified on `require` call');

			// The sqlite3 is actually part of the lib package so we need to do
			// something convoluted to get it working.
			if (modulePath === 'sqlite3') {
				return require('../../node_modules/@joplin/lib/node_modules/sqlite3/sqlite3.js');
			}

			if (['fs-extra'].includes(modulePath)) return require(modulePath);

			throw new Error(`Module not found: ${modulePath}`);
		}

		const callbackId = `cb_${pluginId}_${Date.now()}_${callbackIndex++}`;
		const promise = new Promise((resolve, reject) => {
			callbackPromises[callbackId] = { resolve, reject };
		});

		ipcRendererSend('pluginMessage', {
			target: 'mainWindow',
			pluginId: pluginId,
			callbackId: callbackId,
			path: path,
			args: mapEventHandlersToIds(null, args),
		});

		return promise;
	};

	ipcRenderer.on('pluginMessage', async (_event, message) => {
		if (message.eventId) {
			const eventHandler = eventHandlers_[message.eventId];

			if (!eventHandler) {
				console.error('Got an event ID but no matching event handler: ', message);
				return;
			}

			let result = null;
			let error = null;
			try {
				result = await eventHandler(...message.args);
			} catch (e) {
				error = e;
			}

			if (message.callbackId) {
				ipcRendererSend('pluginMessage', {
					target: 'mainWindow',
					pluginId: pluginId,
					mainWindowCallbackId: message.callbackId,
					result: result,
					error: error,
				});
			}
			return;
		}

		if (message.pluginCallbackId) {
			const promise = callbackPromises[message.pluginCallbackId];
			if (!promise) {
				console.error('Got a callback without matching promise: ', message);
				return;
			}

			if (message.error) {
				promise.reject(message.error);
			} else {
				promise.resolve(message.result);
			}
			return;
		}

		console.warn('Unhandled plugin message:', message);
	});

	const pluginScriptPath = urlParams.get('pluginScript');
	const script = document.createElement('script');
	script.src = pluginScriptPath;
	document.head.appendChild(script);

	globalObject.joplin = sandboxProxy(target);
})(window);
