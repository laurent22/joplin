const { _ } = require('lib/locale.js');
const { BrowserWindow } = require('electron');
const url = require('url')
const path = require('path')
const urlUtils = require('lib/urlUtils.js');

class ElectronAppWrapper {

	constructor(electronApp, env) {
		this.electronApp_ = electronApp;
		this.env_ = env;
		this.win_ = null;
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

		this.win_ = new BrowserWindow({
			'x': windowState.x,
			'y': windowState.y,
			'width': windowState.width,
			'height': windowState.height
		})

		this.win_.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true
		}))

		if (this.env_ === 'dev') this.win_.webContents.openDevTools();

		this.win_.on('closed', () => {
			this.win_ = null
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

	async start() {
		// Since we are doing other async things before creating the window, we might miss
		// the "ready" event. So we use the function below to make sure that the app is ready.
		await this.waitForElectronAppReady();

		this.createWindow();

		this.electronApp_.on('window-all-closed', () => {
			// On macOS it is common for applications and their menu bar
			// to stay active until the user quits explicitly with Cmd + Q
			if (process.platform !== 'darwin') {
				this.electronApp_.quit()
			}
		})

		this.electronApp_.on('activate', () => {
			// On macOS it's common to re-create a window in the app when the
			// dock icon is clicked and there are no other windows open.
			if (this.win_ === null) {
				createWindow()
			}
		})
	}

}

module.exports = { ElectronAppWrapper };