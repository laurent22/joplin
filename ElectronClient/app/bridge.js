const { _ } = require('lib/locale.js');
const { Logger } = require('lib/logger.js');

class Bridge {

	constructor(electronWrapper) {
		this.electronWrapper_ = electronWrapper;
	}

	electronApp() {
		return this.electronWrapper_;
	}

	processArgv() {
		return process.argv;
	}

	window() {
		return this.electronWrapper_.window();
	}

	windowContentSize() {
		if (!this.window()) return { width: 0, height: 0 };
		const s = this.window().getContentSize();
		return { width: s[0], height: s[1] };
	}

	windowSize() {
		if (!this.window()) return { width: 0, height: 0 };
		const s = this.window().getSize();
		return { width: s[0], height: s[1] };
	}

	windowSetSize(width, height) {
		if (!this.window()) return;
		return this.window().setSize(width, height);
	}

	showOpenDialog(options) {
		const {dialog} = require('electron');
		return dialog.showOpenDialog(options);
	}

	showMessageBox(options) {
		const {dialog} = require('electron');
		return dialog.showMessageBox(options);
	}

	showErrorMessageBox(message) {
		return this.showMessageBox({
			type: 'error',
			message: message,
		});
	}

	showConfirmMessageBox(message) {
		const result = this.showMessageBox({
			type: 'question',
			message: message,
			buttons: [_('OK'), _('Cancel')],
		});
		return result === 0;
	}

	get Menu() {
		return require('electron').Menu;
	}

	get MenuItem() {
		return require('electron').MenuItem;
	}

	openExternal(url) {
		return require('electron').shell.openExternal(url)
	}

	openItem(fullPath) {
		return require('electron').shell.openItem(fullPath)
	}

	checkForUpdatesAndNotify(logFilePath) {
		if (!this.autoUpdater_) {
			const logger = new Logger();
			logger.addTarget('file', { path: logFilePath });
			logger.setLevel(Logger.LEVEL_DEBUG);
			logger.info('checkForUpdatesAndNotify: Intializing...');
			this.autoUpdater_ = require("electron-updater").autoUpdater;
			this.autoUpdater_.logger = logger;
		}

		return this.autoUpdater_.checkForUpdatesAndNotify();
	}

}

let bridge_ = null;

function initBridge(wrapper) {
	if (bridge_) throw new Error('Bridge already initialized');
	bridge_ = new Bridge(wrapper);
	return bridge_;
}

function bridge() {
	if (!bridge_) throw new Error('Bridge not initialized');
	return bridge_;
}	

module.exports = { bridge, initBridge }