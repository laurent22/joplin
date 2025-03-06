// This is the API that JS files loaded from the webview can see
const webviewApiPromises_ = {};
let viewMessageHandler_ = () => {};

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const webviewApi = {
	postMessage: function(message) {
		const messageId = `userWebview_${Date.now()}${Math.random()}`;

		const promise = new Promise((resolve, reject) => {
			webviewApiPromises_[messageId] = { resolve, reject };
		});

		window.postMessage({
			target: 'postMessageService.message',
			message: {
				from: 'userWebview',
				to: 'plugin',
				id: messageId,
				content: message,
			},
		});

		return promise;
	},

	onMessage: function(viewMessageHandler) {
		viewMessageHandler_ = viewMessageHandler;
		window.postMessage({
			target: 'postMessageService.registerViewMessageHandler',
		});
	},
};

(function() {
	function docReady(fn) {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			setTimeout(fn, 1);
		} else {
			document.addEventListener('DOMContentLoaded', fn);
		}
	}

	function fileExtension(path) {
		if (!path) throw new Error('Path is empty');

		const output = path.split('.');
		if (output.length <= 1) return '';
		return output[output.length - 1];
	}

	docReady(() => {
		const rootElement = document.createElement('div');
		rootElement.setAttribute('id', 'joplin-plugin-content-root');
		document.getElementsByTagName('body')[0].appendChild(rootElement);

		const contentElement = document.createElement('div');
		contentElement.setAttribute('id', 'joplin-plugin-content');
		rootElement.appendChild(contentElement);

		const headElement = document.getElementsByTagName('head')[0];

		const addedScripts = {};

		function addScript(scriptPath, id = null) {
			const ext = fileExtension(scriptPath).toLowerCase();

			if (ext === 'js') {
				const script = document.createElement('script');
				script.src = scriptPath;
				if (id) script.id = id;
				headElement.appendChild(script);
			} else if (ext === 'css') {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = scriptPath;
				if (id) link.id = id;
				headElement.appendChild(link);
			} else {
				throw new Error(`Unsupported script: ${scriptPath}`);
			}
		}

		const ipc = {
			setHtml: (args) => {
				contentElement.innerHTML = args.html;

				// console.debug('UserWebviewIndex: setting html to', args.html);

				window.requestAnimationFrame(() => {
					// eslint-disable-next-line no-console
					console.debug('UserWebviewIndex: setting html callback', args.hash);
					window.postMessage({ target: 'UserWebview', message: 'htmlIsSet', hash: args.hash }, '*');
				});
			},

			setScript: (args) => {
				const { script, key } = args;

				const scriptPath = `file://${script}`;
				const elementId = `joplin-script-${key}`;

				if (addedScripts[elementId]) {
					document.getElementById(elementId).remove();
					delete addedScripts[elementId];
				}

				addScript(scriptPath, elementId);
			},

			setScripts: (args) => {
				const scripts = args.scripts;

				if (!scripts) return;

				for (let i = 0; i < scripts.length; i++) {
					const scriptPath = `file://${scripts[i]}`;

					if (addedScripts[scriptPath]) continue;
					addedScripts[scriptPath] = true;

					addScript(scriptPath);
				}
			},

			'postMessageService.response': (event) => {
				const message = event.message;
				const promise = webviewApiPromises_[message.responseId];
				if (!promise) {
					console.warn('postMessageService.response: Could not find recorded promise to process message response', message);
					return;
				}

				if (message.error) {
					promise.reject(message.error);
				} else {
					promise.resolve(message.response);
				}
			},

			'postMessageService.plugin_message': (message) => {
				if (!viewMessageHandler_) {
					console.warn('postMessageService.plugin_message: Could not process message because no onMessage handler was defined', message);
					return;
				}
				viewMessageHandler_(message);
			},
		};

		// respond to window.postMessage({})
		window.addEventListener('message', ((event) => {
			if (!event.data || event.data.target !== 'webview') return;

			const callName = event.data.name;
			const args = event.data.args;

			if (!ipc[callName]) {
				console.warn('Missing IPC function:', event.data);
			} else {
				// eslint-disable-next-line no-console
				console.debug('UserWebviewIndex: Got message', callName, args);
				ipc[callName](args);
			}
		}));

		// Send a message to the containing component to notify it that the
		// view content is fully ready.
		//
		// Need to send it with a delay to make sure all listeners are
		// ready when the message is sent.
		window.requestAnimationFrame(() => {
			// eslint-disable-next-line no-console
			console.debug('UserWebViewIndex: calling isReady');
			window.postMessage({ target: 'UserWebview', message: 'ready' }, '*');
		});
	});
})();
