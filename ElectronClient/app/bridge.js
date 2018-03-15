const { _ } = require('lib/locale.js');
const { dirname } = require('lib/path-utils.js');
const { Logger } = require('lib/logger.js');

class Bridge {

	constructor(electronWrapper) {
		this.electronWrapper_ = electronWrapper;
		this.autoUpdateLogger_ = null;
		this.lastSelectedPath_ = null;
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

	showSaveDialog(options) {
		const {dialog} = require('electron');
		if (!options) options = {};
		if (!('defaultPath' in options) && this.lastSelectedPath_) options.defaultPath = this.lastSelectedPath_;
		const filePath = dialog.showSaveDialog(this.window(), options);
		if (filePath) {
			this.lastSelectedPath_ = filePath;
		}
		return filePath;
	}

	showOpenDialog(options) {
		const {dialog} = require('electron');
		if (!options) options = {};
		if (!('defaultPath' in options) && this.lastSelectedPath_) options.defaultPath = this.lastSelectedPath_;
		if (!('createDirectory' in options)) options.createDirectory = true;
		const filePaths = dialog.showOpenDialog(this.window(), options);
		if (filePaths && filePaths.length) {
			this.lastSelectedPath_ = dirname(filePaths[0]);
		}
		return filePaths;
	}

	// Don't use this directly - call one of the showXxxxxxxMessageBox() instead
	showMessageBox_(window, options) {
		const {dialog} = require('electron');
		const nativeImage = require('electron').nativeImage
		if (!window) window = this.window();
		return dialog.showMessageBox(window, options);
	}

	showErrorMessageBox(message) {
		return this.showMessageBox_(this.window(), {
			type: 'error',
			message: message,
		});
	}

	showConfirmMessageBox(message) {
		const result = this.showMessageBox_(this.window(), {
			type: 'question',
			message: message,
			buttons: [_('OK'), _('Cancel')],
		});
		return result === 0;
	}

	showInfoMessageBox(message, options = {}) {
		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'info',
			message: message,
			buttons: [_('OK')],
		}, options));
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

	checkForUpdates(inBackground, window, logFilePath) {
		const { checkForUpdates } = require('./checkForUpdates.js');
		checkForUpdates(inBackground, window, logFilePath);
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