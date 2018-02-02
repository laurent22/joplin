const { _ } = require('lib/locale.js');
const { BrowserWindow, Menu, Tray } = require('electron');
const { shim } = require('lib/shim');
const url = require('url')
const path = require('path')
const urlUtils = require('lib/urlUtils.js');

class ElectronAppWrapper {

	constructor(electronApp, env) {
		this.electronApp_ = electronApp;
		this.env_ = env;
		this.win_ = null;
		this.willQuitApp_ = false;
		this.tray_ = null;
	}

	electronApp() {
		return this.electronApp_;
	}

	setLogger(v) {
		this.logger_ = v;
	}

	logger() {
		return this.logger_;
	}

	window() {
		return this.win_;
	}

	createWindow() {
		const windowStateKeeper = require('electron-window-state');

		// Load the previous state with fallback to defaults
		const windowState = windowStateKeeper({
			defaultWidth: 800,
			defaultHeight: 600,
		});

		const windowOptions = {
			'x': windowState.x,
			'y': windowState.y,
			'width': windowState.width,
			'height': windowState.height,
		};

		// Linux icon workaround for bug https://github.com/electron-userland/electron-builder/issues/2098
		// Fix: https://github.com/electron-userland/electron-builder/issues/2269
		if (shim.isLinux()) windowOptions.icon = __dirname + '/build/icons/128x128.png';

		this.win_ = new BrowserWindow(windowOptions)

		this.win_.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true
		}))

		// Uncomment this to view errors if the application does not start
		if (this.env_ === 'dev') this.win_.webContents.openDevTools();

		this.win_.on('close', (event) => {
			// If it's on macOS, the app is completely closed only if the user chooses to close the app (willQuitApp_ will be true)
			// otherwise the window is simply hidden, and will be re-open once the app is "activated" (which happens when the
			// user clicks on the icon in the task bar).

			// On Windows and Linux, the app is closed when the window is closed *except* if the tray icon is used. In which
			// case the app must be explicitely closed with Ctrl+Q or by right-clicking on the tray icon and selecting "Exit".

			if (process.platform === 'darwin') {
				if (this.willQuitApp_) {
					this.win_ = null;
				} else {
					event.preventDefault();
					this.win_.hide();
				}
			} else {
				if (this.trayShown() && !this.willQuitApp_) {
					event.preventDefault();
					this.win_.hide();
				} else {
					this.win_ = null;
				}
			}
		})

		// Let us register listeners on the window, so we can update the state
		// automatically (the listeners will be removed when the window is closed)
		// and restore the maximized or full screen state
		windowState.manage(this.win_);
	}

	async waitForElectronAppReady() {
		if (this.electronApp().isReady()) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const iid = setInterval(() => {
				if (this.electronApp().isReady()) {
					clearInterval(iid);
					resolve();
				}
			}, 10);
		});
	}

	async exit() {
		this.electronApp_.quit();
	}

	trayShown() {
		return !!this.tray_;
	}

	// Note: this must be called only after the "ready" event of the app has been dispatched
	createTray(contextMenu) {
		this.tray_ = new Tray(__dirname + '/build/icons/16x16.png')
		this.tray_.setToolTip(this.electronApp_.getName())
		this.tray_.setContextMenu(contextMenu)

		this.tray_.on('click', () => {
			this.window().show();
		});
	}

	destroyTray() {
		if (!this.tray_) return;
		this.tray_.destroy();
		this.tray_ = null;
	}

	async start() {
		// Since we are doing other async things before creating the window, we might miss
		// the "ready" event. So we use the function below to make sure that the app is ready.
		await this.waitForElectronAppReady();

		this.createWindow();

		this.electronApp_.on('before-quit', () => {
			this.willQuitApp_ = true;
		})

		this.electronApp_.on('window-all-closed', () => {
			this.electronApp_.quit();
		})

		this.electronApp_.on('activate', () => {
			this.win_.show();
		})
	}

}

module.exports = { ElectronAppWrapper };