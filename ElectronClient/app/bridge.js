const { _ } = require('lib/locale.js');

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

	checkForUpdatesAndNotify(logger) {
		const autoUpdater = require("electron-updater").autoUpdater;
		logger.info('Doing autoupdate checkForUpdatesAndNotify...');
		autoUpdater.logger = logger;
		return autoUpdater.checkForUpdatesAndNotify();
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