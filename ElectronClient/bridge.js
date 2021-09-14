const { _, setLocale } = require('lib/locale.js');
const { shim } = require('lib/shim');
const { dirname, toSystemSlashes } = require('lib/path-utils.js');
const { BrowserWindow, nativeTheme } = require('electron');

class Bridge {

	constructor(electronWrapper) {
		this.electronWrapper_ = electronWrapper;
		this.autoUpdateLogger_ = null;
		this.lastSelectedPaths_ = {
			file: null,
			directory: null,
		};
	}

	electronApp() {
		return this.electronWrapper_;
	}

	env() {
		return this.electronWrapper_.env();
	}

	processArgv() {
		return process.argv;
	}

	window() {
		return this.electronWrapper_.window();
	}

	showItemInFolder(fullPath) {
		return require('electron').shell.showItemInFolder(toSystemSlashes(fullPath));
	}

	newBrowserWindow(options) {
		return new BrowserWindow(options);
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

	openDevTools() {
		return this.window().webContents.openDevTools();
	}

	closeDevTools() {
		return this.window().webContents.closeDevTools();
	}

	showSaveDialog(options) {
		const { dialog } = require('electron');
		if (!options) options = {};
		if (!('defaultPath' in options) && this.lastSelectedPaths_.file) options.defaultPath = this.lastSelectedPaths_.file;
		const filePath = dialog.showSaveDialogSync(this.window(), options);
		if (filePath) {
			this.lastSelectedPaths_.file = filePath;
		}
		return filePath;
	}

	showOpenDialog(options) {
		const { dialog } = require('electron');
		if (!options) options = {};
		let fileType = 'file';
		if (options.properties && options.properties.includes('openDirectory')) fileType = 'directory';
		if (!('defaultPath' in options) && this.lastSelectedPaths_[fileType]) options.defaultPath = this.lastSelectedPaths_[fileType];
		if (!('createDirectory' in options)) options.createDirectory = true;
		const filePaths = dialog.showOpenDialogSync(this.window(), options);
		if (filePaths && filePaths.length) {
			this.lastSelectedPaths_[fileType] = dirname(filePaths[0]);
		}
		return filePaths;
	}

	// Don't use this directly - call one of the showXxxxxxxMessageBox() instead
	showMessageBox_(window, options) {
		const { dialog } = require('electron');
		if (!window) window = this.window();
		return dialog.showMessageBoxSync(window, options);
	}

	showErrorMessageBox(message) {
		return this.showMessageBox_(this.window(), {
			type: 'error',
			message: message,
			buttons: [_('OK')],
		});
	}

	showConfirmMessageBox(message, options = null) {
		if (options === null) options = {};

		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'question',
			message: message,
			cancelId: 1,
			buttons: [_('OK'), _('Cancel')],
		}, options));

		return result === 0;
	}

	/* returns the index of the clicked button */
	showMessageBox(message, options = null) {
		if (options === null) options = {};

		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'question',
			message: message,
			buttons: [_('OK'), _('Cancel')],
		}, options));

		return result;
	}

	showInfoMessageBox(message, options = {}) {
		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'info',
			message: message,
			buttons: [_('OK')],
		}, options));
		return result === 0;
	}

	setLocale(locale) {
		setLocale(locale);
	}

	get Menu() {
		return require('electron').Menu;
	}

	get MenuItem() {
		return require('electron').MenuItem;
	}

	openExternal(url) {
		return require('electron').shell.openExternal(url);
	}

	openItem(fullPath) {
		return require('electron').shell.openItem(fullPath);
	}

	checkForUpdates(inBackground, window, logFilePath, options) {
		const { checkForUpdates } = require('./checkForUpdates.js');
		checkForUpdates(inBackground, window, logFilePath, options);
	}

	buildDir() {
		return this.electronApp().buildDir();
	}

	screen() {
		return require('electron').screen;
	}

	shouldUseDarkColors() {
		return nativeTheme.shouldUseDarkColors;
	}

	addEventListener(name, fn) {
		if (name === 'nativeThemeUpdated') {
			nativeTheme.on('updated', fn);
		} else {
			throw new Error(`Unsupported event: ${name}`);
		}
	}

	restart() {
		// Note that in this case we are not sending the "appClose" event
		// to notify services and component that the app is about to close
		// but for the current use-case it's not really needed.
		const { app } = require('electron');

		if (shim.isPortable()) {
			const options = {
				execPath: process.env.PORTABLE_EXECUTABLE_FILE,
			};
			app.relaunch(options);
		} else if (shim.isLinux()) {
			this.showInfoMessageBox(_('The app is now going to close. Please relaunch it to complete the process.'));
		} else {
			app.relaunch();
		}

		app.exit();
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

module.exports = { bridge, initBridge };
