const { EventEmitter } = require('events');
const process = require('process');
const { webContents } = require('electron');

const ProcessManagerWindow = require('./ProcessManagerWindow.js');

const defaultOptions = { defaultSorting: { path: null, how: null } };

class ProcessManager extends EventEmitter {

	constructor() {
		super();

		// legacy
		this.openProcessManager = this.open.bind(this);
	}

	// in case this isn't already done in the app.
	initializeElectronRemote() {
		return require('@electron/remote/main').initialize();
	}

	// We pass the electron/remote/main instance to the manager to ensure it's
	// using the same as the main application.
	//
	// When using a peer dependency it seems the package ends up using its own
	// instance, which doesn't work.
	open(electronRemote, options = defaultOptions) {
		if (this.window) {
			this.window.focus();
		}

		this.window = new ProcessManagerWindow(electronRemote);
		this.window.defaultSorting = options.defaultSorting || {};
		this.window.showWhenReady();
		this.window.on('kill-process', pid => this.killProcess(pid));
		this.window.on('open-dev-tools', webContentsId => this.openDevTools(webContentsId));
		this.window.on('closed', () => this.window = null);
		this.emit('open-window', this.window);

		return this.window;
	}

	killProcess(pid) {
		this.emit('will-kill-process', pid, this.window);
		process.kill(pid);
		this.emit('killed-process', pid, this.window);
	}

	openDevTools(webContentsId) {
		this.emit('will-open-dev-tools', webContentsId, this.window);

		const wc = webContents.fromId(webContentsId);
		require('@electron/remote/main').enable(wc);
		wc.openDevTools({ mode: 'detach' });

		this.emit('did-open-dev-tools', webContentsId, this.window);
	}

}

module.exports = ProcessManager;
