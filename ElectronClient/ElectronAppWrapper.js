const { BrowserWindow, Tray, screen } = require('electron');
const { shim } = require('lib/shim');
const url = require('url');
const path = require('path');
const { dirname } = require('lib/path-utils');
const fs = require('fs-extra');
const { ipcMain } = require('electron');

class ElectronAppWrapper {

	constructor(electronApp, env, profilePath) {
		this.electronApp_ = electronApp;
		this.env_ = env;
		this.profilePath_ = profilePath;
		this.win_ = null;
		this.willQuitApp_ = false;
		this.tray_ = null;
		this.buildDir_ = null;
		this.rendererProcessQuitReply_ = null;
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

	env() {
		return this.env_;
	}

	createWindow() {
		// Set to true to view errors if the application does not start
		const debugEarlyBugs = this.env_ === 'dev';

		const windowStateKeeper = require('electron-window-state');


		const stateOptions = {
			defaultWidth: Math.round(0.8 * screen.getPrimaryDisplay().workArea.width),
			defaultHeight: Math.round(0.8 * screen.getPrimaryDisplay().workArea.height),
			file: `window-state-${this.env_}.json`,
		};

		if (this.profilePath_) stateOptions.path = this.profilePath_;

		// Load the previous state with fallback to defaults
		const windowState = windowStateKeeper(stateOptions);

		const windowOptions = {
			x: windowState.x,
			y: windowState.y,
			width: windowState.width,
			height: windowState.height,
			minWidth: 100,
			minHeight: 100,
			backgroundColor: '#fff', // required to enable sub pixel rendering, can't be in css
			webPreferences: {
				nodeIntegration: true,
				spellcheck: true,
			},
			webviewTag: true,
			// We start with a hidden window, which is then made visible depending on the showTrayIcon setting
			// https://github.com/laurent22/joplin/issues/2031
			show: debugEarlyBugs,
		};

		// Linux icon workaround for bug https://github.com/electron-userland/electron-builder/issues/2098
		// Fix: https://github.com/electron-userland/electron-builder/issues/2269
		if (shim.isLinux()) windowOptions.icon = path.join(__dirname, '..', 'build/icons/128x128.png');

		require('electron-context-menu')({
			shouldShowMenu: (event, params) => {
				// params.inputFieldType === 'none' when right-clicking the text editor. This is a bit of a hack to detect it because in this
				// case we don't want to use the built-in context menu but a custom one.
				return params.isEditable && params.inputFieldType !== 'none';
			},
		});

		this.win_ = new BrowserWindow(windowOptions);

		if (!screen.getDisplayMatching(this.win_.getBounds())) {
			const { width: windowWidth, height: windowHeight } = this.win_.getBounds();
			const { width: primaryDisplayWidth, height: primaryDisplayHeight } = screen.getPrimaryDisplay().workArea;
			this.win_.setPosition(primaryDisplayWidth / 2 - windowWidth, primaryDisplayHeight / 2 - windowHeight);
		}

		this.win_.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true,
		}));

		// Note that on Windows, calling openDevTools() too early results in a white window with no error message.
		// Waiting for one of the ready events might work but they might not be triggered if there's an error, so
		// the easiest is to use a timeout. Keep in mind that if you get a white window on Windows it might be due
		// to this line though.
		if (debugEarlyBugs) setTimeout(() => this.win_.webContents.openDevTools(), 3000);

		this.win_.on('close', (event) => {
			// If it's on macOS, the app is completely closed only if the user chooses to close the app (willQuitApp_ will be true)
			// otherwise the window is simply hidden, and will be re-open once the app is "activated" (which happens when the
			// user clicks on the icon in the task bar).

			// On Windows and Linux, the app is closed when the window is closed *except* if the tray icon is used. In which
			// case the app must be explicitly closed with Ctrl+Q or by right-clicking on the tray icon and selecting "Exit".

			let isGoingToExit = false;

			if (process.platform === 'darwin') {
				if (this.willQuitApp_) {
					isGoingToExit = true;
				} else {
					event.preventDefault();
					this.hide();
				}
			} else {
				if (this.trayShown() && !this.willQuitApp_) {
					event.preventDefault();
					this.win_.hide();
				} else {
					isGoingToExit = true;
				}
			}

			if (isGoingToExit) {
				if (!this.rendererProcessQuitReply_) {
					// If we haven't notified the renderer process yet, do it now
					// so that it can tell us if we can really close the app or not.
					// Search for "appClose" event for closing logic on renderer side.
					event.preventDefault();
					this.win_.webContents.send('appClose');
				} else {
					// If the renderer process has responded, check if we can close or not
					if (this.rendererProcessQuitReply_.canClose) {
						// Really quit the app
						this.rendererProcessQuitReply_ = null;
						this.win_ = null;
					} else {
						// Wait for renderer to finish task
						event.preventDefault();
						this.rendererProcessQuitReply_ = null;
					}
				}
			}
		});

		ipcMain.on('asynchronous-message', (event, message, args) => {
			if (message === 'appCloseReply') {
				// We got the response from the renderer process:
				// save the response and try quit again.
				this.rendererProcessQuitReply_ = args;
				this.electronApp_.quit();
			}
		});

		// Let us register listeners on the window, so we can update the state
		// automatically (the listeners will be removed when the window is closed)
		// and restore the maximized or full screen state
		windowState.manage(this.win_);

		// HACK: Ensure the window is hidden, as `windowState.manage` may make the window
		// visible with isMaximized set to true in window-state-${this.env_}.json.
		// https://github.com/laurent22/joplin/issues/2365
		if (!windowOptions.show) {
			this.win_.hide();
		}
	}

	async waitForElectronAppReady() {
		if (this.electronApp().isReady()) return Promise.resolve();

		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (this.electronApp().isReady()) {
					clearInterval(iid);
					resolve();
				}
			}, 10);
		});
	}

	async quit() {
		this.electronApp_.quit();
	}

	exit(errorCode = 0) {
		this.electronApp_.exit(errorCode);
	}

	trayShown() {
		return !!this.tray_;
	}

	// This method is used in macOS only to hide the whole app (and not just the main window)
	// including the menu bar. This follows the macOS way of hiding an app.
	hide() {
		this.electronApp_.hide();
	}

	buildDir() {
		if (this.buildDir_) return this.buildDir_;
		let dir = `${__dirname}/build`;
		if (!fs.pathExistsSync(dir)) {
			dir = `${dirname(__dirname)}/build`;
			if (!fs.pathExistsSync(dir)) throw new Error('Cannot find build dir');
		}

		this.buildDir_ = dir;
		return dir;
	}

	trayIconFilename_() {
		let output = '';

		if (process.platform === 'darwin') {
			output = 'macos-16x16Template.png'; // Electron Template Image format
		} else {
			output = '16x16.png';
		}

		if (this.env_ === 'dev') output = '16x16-dev.png';

		return output;
	}

	// Note: this must be called only after the "ready" event of the app has been dispatched
	createTray(contextMenu) {
		try {
			this.tray_ = new Tray(`${this.buildDir()}/icons/${this.trayIconFilename_()}`);
			this.tray_.setToolTip(this.electronApp_.name);
			this.tray_.setContextMenu(contextMenu);

			this.tray_.on('click', () => {
				this.window().show();
			});
		} catch (error) {
			console.error('Cannot create tray', error);
		}
	}

	destroyTray() {
		if (!this.tray_) return;
		this.tray_.destroy();
		this.tray_ = null;
	}

	ensureSingleInstance() {
		if (this.env_ === 'dev') return false;

		const gotTheLock = this.electronApp_.requestSingleInstanceLock();

		if (!gotTheLock) {
			// Another instance is already running - exit
			this.electronApp_.quit();
			return true;
		}

		// Someone tried to open a second instance - focus our window instead
		this.electronApp_.on('second-instance', () => {
			const win = this.window();
			if (!win) return;
			if (win.isMinimized()) win.restore();
			win.show();
			win.focus();
		});

		return false;
	}

	async start() {
		// Since we are doing other async things before creating the window, we might miss
		// the "ready" event. So we use the function below to make sure that the app is ready.
		await this.waitForElectronAppReady();

		const alreadyRunning = this.ensureSingleInstance();
		if (alreadyRunning) return;

		this.createWindow();

		this.electronApp_.on('before-quit', () => {
			this.willQuitApp_ = true;
		});

		this.electronApp_.on('window-all-closed', () => {
			this.electronApp_.quit();
		});

		this.electronApp_.on('activate', () => {
			this.win_.show();
		});
	}

}

module.exports = { ElectronAppWrapper };
