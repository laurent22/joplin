import Logger from '@joplin/lib/Logger';
import { PluginMessage } from './services/plugins/PluginRunner';
import shim from '@joplin/lib/shim';
import { isCallbackUrl } from '@joplin/lib/callbackUrlUtils';

import { BrowserWindow, Tray, screen } from 'electron';
const url = require('url');
const path = require('path');
const { dirname } = require('@joplin/lib/path-utils');
const fs = require('fs-extra');
const { ipcMain } = require('electron');

interface RendererProcessQuitReply {
	canClose: boolean;
}

interface PluginWindows {
	[key: string]: any;
}

export default class ElectronAppWrapper {

	private logger_: Logger = null;
	private electronApp_: any;
	private env_: string;
	private isDebugMode_: boolean;
	private profilePath_: string;
	private win_: BrowserWindow = null;
	private willQuitApp_: boolean = false;
	private tray_: any = null;
	private buildDir_: string = null;
	private rendererProcessQuitReply_: RendererProcessQuitReply = null;
	private pluginWindows_: PluginWindows = {};
	private initialCallbackUrl_: string = null;

	public constructor(electronApp: any, env: string, profilePath: string, isDebugMode: boolean, initialCallbackUrl: string) {
		this.electronApp_ = electronApp;
		this.env_ = env;
		this.isDebugMode_ = isDebugMode;
		this.profilePath_ = profilePath;
		this.initialCallbackUrl_ = initialCallbackUrl;
	}

	public electronApp() {
		return this.electronApp_;
	}

	public setLogger(v: Logger) {
		this.logger_ = v;
	}

	public logger() {
		return this.logger_;
	}

	public window() {
		return this.win_;
	}

	public env() {
		return this.env_;
	}

	public initialCallbackUrl() {
		return this.initialCallbackUrl_;
	}

	private async createSplashScreen() {
		const splash = new BrowserWindow({
			width: 500,
			height: 300,
			transparent: true,
			frame: false,
			alwaysOnTop: true,
		});

		await splash.loadFile('splash.html');
		splash.center();

		return splash;
	}

	public createWindow() {
		// Set to true to view errors if the application does not start
		const debugEarlyBugs = this.env_ === 'dev' || this.isDebugMode_;

		const windowStateKeeper = require('electron-window-state');


		const stateOptions: any = {
			defaultWidth: Math.round(0.8 * screen.getPrimaryDisplay().workArea.width),
			defaultHeight: Math.round(0.8 * screen.getPrimaryDisplay().workArea.height),
			file: `window-state-${this.env_}.json`,
		};

		if (this.profilePath_) stateOptions.path = this.profilePath_;

		// Load the previous state with fallback to defaults
		const windowState = windowStateKeeper(stateOptions);

		const windowOptions: any = {
			x: windowState.x,
			y: windowState.y,
			width: windowState.width,
			height: windowState.height,
			minWidth: 100,
			minHeight: 100,
			backgroundColor: '#fff', // required to enable sub pixel rendering, can't be in css
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
				spellcheck: true,
				enableRemoteModule: true,
			},
			webviewTag: true,
			// We start with a hidden window, which is then made visible depending on the showTrayIcon setting
			// https://github.com/laurent22/joplin/issues/2031
			show: debugEarlyBugs,
		};

		// Linux icon workaround for bug https://github.com/electron-userland/electron-builder/issues/2098
		// Fix: https://github.com/electron-userland/electron-builder/issues/2269
		if (shim.isLinux()) windowOptions.icon = path.join(__dirname, '..', 'build/icons/128x128.png');

		this.win_ = new BrowserWindow(windowOptions);

		require('@electron/remote/main').enable(this.win_.webContents);

		if (!screen.getDisplayMatching(this.win_.getBounds())) {
			const { width: windowWidth, height: windowHeight } = this.win_.getBounds();
			const { width: primaryDisplayWidth, height: primaryDisplayHeight } = screen.getPrimaryDisplay().workArea;
			this.win_.setPosition(primaryDisplayWidth / 2 - windowWidth, primaryDisplayHeight / 2 - windowHeight);
		}

		void this.win_.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true,
		}));

		// Note that on Windows, calling openDevTools() too early results in a white window with no error message.
		// Waiting for one of the ready events might work but they might not be triggered if there's an error, so
		// the easiest is to use a timeout. Keep in mind that if you get a white window on Windows it might be due
		// to this line though.
		if (debugEarlyBugs) {
			setTimeout(() => {
				try {
					this.win_.webContents.openDevTools();
				} catch (error) {
				// This will throw an exception "Object has been destroyed" if the app is closed
				// in less that the timeout interval. It can be ignored.
					console.warn('Error opening dev tools', error);
				}
			}, 3000);
		}

		this.win_.on('close', (event: any) => {
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

		ipcMain.on('asynchronous-message', (_event: any, message: string, args: any) => {
			if (message === 'appCloseReply') {
				// We got the response from the renderer process:
				// save the response and try quit again.
				this.rendererProcessQuitReply_ = args;
				this.quit();
			}
		});

		// This handler receives IPC messages from a plugin or from the main window,
		// and forwards it to the main window or the plugin window.
		ipcMain.on('pluginMessage', (_event: any, message: PluginMessage) => {
			try {
				if (message.target === 'mainWindow') {
					this.win_.webContents.send('pluginMessage', message);
				}

				if (message.target === 'plugin') {
					const win = this.pluginWindows_[message.pluginId];
					if (!win) {
						this.logger().error(`Trying to send IPC message to non-existing plugin window: ${message.pluginId}`);
						return;
					}

					win.webContents.send('pluginMessage', message);
				}
			} catch (error) {
				// An error might happen when the app is closing and a plugin
				// sends a message. In which case, the above code would try to
				// access a destroyed webview.
				// https://github.com/laurent22/joplin/issues/4570
				console.error('Could not process plugin message:', message);
				console.error(error);
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

	public registerPluginWindow(pluginId: string, window: any) {
		this.pluginWindows_[pluginId] = window;
	}

	public async waitForElectronAppReady() {
		if (this.electronApp().isReady()) return Promise.resolve();

		return new Promise<void>((resolve) => {
			const iid = setInterval(() => {
				if (this.electronApp().isReady()) {
					clearInterval(iid);
					resolve(null);
				}
			}, 10);
		});
	}

	public quit() {
		this.electronApp_.quit();
	}

	public exit(errorCode = 0) {
		this.electronApp_.exit(errorCode);
	}

	public trayShown() {
		return !!this.tray_;
	}

	// This method is used in macOS only to hide the whole app (and not just the main window)
	// including the menu bar. This follows the macOS way of hiding an app.
	public hide() {
		this.electronApp_.hide();
	}

	public buildDir() {
		if (this.buildDir_) return this.buildDir_;
		let dir = `${__dirname}/build`;
		if (!fs.pathExistsSync(dir)) {
			dir = `${dirname(__dirname)}/build`;
			if (!fs.pathExistsSync(dir)) throw new Error('Cannot find build dir');
		}

		this.buildDir_ = dir;
		return dir;
	}

	private trayIconFilename_() {
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
	public createTray(contextMenu: any) {
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

	public destroyTray() {
		if (!this.tray_) return;
		this.tray_.destroy();
		this.tray_ = null;
	}

	public ensureSingleInstance() {
		if (this.env_ === 'dev') return false;

		const gotTheLock = this.electronApp_.requestSingleInstanceLock();

		if (!gotTheLock) {
			// Another instance is already running - exit
			this.quit();
			return true;
		}

		// Someone tried to open a second instance - focus our window instead
		this.electronApp_.on('second-instance', (_e: any, argv: string[]) => {
			const win = this.window();
			if (!win) return;
			if (win.isMinimized()) win.restore();
			win.show();
			win.focus();
			if (process.platform !== 'darwin') {
				const url = argv.find((arg) => isCallbackUrl(arg));
				if (url) {
					void this.openCallbackUrl(url);
				}
			}
		});

		return false;
	}

	public async start() {
		// Since we are doing other async things before creating the window, we might miss
		// the "ready" event. So we use the function below to make sure that the app is ready.
		await this.waitForElectronAppReady();

		const alreadyRunning = this.ensureSingleInstance();
		if (alreadyRunning) return;

		const splash = await this.createSplashScreen();

		ipcMain.on('hide-splash', () => {
			splash.destroy();
		});

		this.createWindow();

		this.electronApp_.on('before-quit', () => {
			this.willQuitApp_ = true;
		});

		this.electronApp_.on('window-all-closed', () => {
			this.quit();
		});

		this.electronApp_.on('activate', () => {
			this.win_.show();
		});

		this.electronApp_.on('open-url', (event: any, url: string) => {
			event.preventDefault();
			void this.openCallbackUrl(url);
		});
	}

	public async openCallbackUrl(url: string) {
		this.win_.webContents.send('asynchronous-message', 'openCallbackUrl', {
			url: url,
		});
	}

}
