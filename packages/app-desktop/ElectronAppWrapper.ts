import Logger, { LoggerWrapper } from '@joplin/utils/Logger';
import { PluginMessage } from './services/plugins/PluginRunner';
import AutoUpdaterService, { defaultUpdateInterval, initialUpdateStartup } from './services/autoUpdater/AutoUpdaterService';
import type ShimType from '@joplin/lib/shim';
const shim: typeof ShimType = require('@joplin/lib/shim').default;
import { isCallbackUrl } from '@joplin/lib/callbackUrlUtils';

import { BrowserWindow, Tray, WebContents, screen } from 'electron';
import bridge from './bridge';
const url = require('url');
const path = require('path');
const { dirname } = require('@joplin/lib/path-utils');
const fs = require('fs-extra');

import { dialog, ipcMain } from 'electron';
import { _ } from '@joplin/lib/locale';
import restartInSafeModeFromMain from './utils/restartInSafeModeFromMain';
import handleCustomProtocols, { CustomProtocolHandler } from './utils/customProtocols/handleCustomProtocols';
import { clearTimeout, setTimeout } from 'timers';

interface RendererProcessQuitReply {
	canClose: boolean;
}

interface PluginWindows {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	[key: string]: any;
}

export default class ElectronAppWrapper {

	private logger_: Logger = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private electronApp_: any;
	private env_: string;
	private isDebugMode_: boolean;
	private profilePath_: string;
	private win_: BrowserWindow = null;
	private willQuitApp_ = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private tray_: any = null;
	private buildDir_: string = null;
	private rendererProcessQuitReply_: RendererProcessQuitReply = null;
	private pluginWindows_: PluginWindows = {};
	private initialCallbackUrl_: string = null;
	private updaterService_: AutoUpdaterService = null;
	private customProtocolHandler_: CustomProtocolHandler = null;
	private updatePollInterval_: ReturnType<typeof setTimeout>|null = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(electronApp: any, env: string, profilePath: string|null, isDebugMode: boolean, initialCallbackUrl: string) {
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

	// Call when the app fails in a significant way.
	//
	// Assumes that the renderer process may be in an invalid state and so cannot
	// be accessed.
	public async handleAppFailure(errorMessage: string, canIgnore: boolean, isTesting?: boolean) {
		await bridge().captureException(new Error(errorMessage));

		const buttons = [];
		buttons.push(_('Quit'));
		const exitIndex = 0;

		if (canIgnore) {
			buttons.push(_('Ignore'));
		}
		const restartIndex = buttons.length;
		buttons.push(_('Restart in safe mode'));

		const { response } = await dialog.showMessageBox({
			message: _('An error occurred: %s', errorMessage),
			buttons,
		});

		if (response === restartIndex) {
			await restartInSafeModeFromMain();

			// A hung renderer seems to prevent the process from exiting completely.
			// In this case, crashing the renderer allows the window to close.
			//
			// Also only run this if not testing (crashing the renderer breaks automated
			// tests).
			if (this.win_ && !this.win_.webContents.isCrashed() && !isTesting) {
				this.win_.webContents.forcefullyCrashRenderer();
			}
		} else if (response === exitIndex) {
			process.exit(1);
		}
	}

	public createWindow() {
		// Set to true to view errors if the application does not start
		const debugEarlyBugs = this.env_ === 'dev' || this.isDebugMode_;

		const windowStateKeeper = require('electron-window-state');


		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const stateOptions: any = {
			defaultWidth: Math.round(0.8 * screen.getPrimaryDisplay().workArea.width),
			defaultHeight: Math.round(0.8 * screen.getPrimaryDisplay().workArea.height),
			file: `window-state-${this.env_}.json`,
		};

		if (this.profilePath_) stateOptions.path = this.profilePath_;

		// Load the previous state with fallback to defaults
		const windowState = windowStateKeeper(stateOptions);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			//
			// On Linux/GNOME, however, the window doesn't show correctly if show is false initially:
			// https://github.com/laurent22/joplin/issues/8256
			show: debugEarlyBugs || shim.isGNOME(),
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

		let unresponsiveTimeout: ReturnType<typeof setTimeout>|null = null;

		this.win_.webContents.on('unresponsive', () => {
			// Don't show the "unresponsive" dialog immediately -- the "unresponsive" event
			// can be fired when showing a dialog or modal (e.g. the update dialog).
			//
			// This gives us an opportunity to cancel it.
			if (unresponsiveTimeout === null) {
				const delayMs = 1000;

				unresponsiveTimeout = setTimeout(() => {
					unresponsiveTimeout = null;
					void this.handleAppFailure(_('Window unresponsive.'), true);
				}, delayMs);
			}
		});

		this.win_.webContents.on('responsive', () => {
			if (unresponsiveTimeout !== null) {
				clearTimeout(unresponsiveTimeout);
				unresponsiveTimeout = null;
			}
		});

		this.win_.webContents.on('render-process-gone', async _event => {
			await this.handleAppFailure('Renderer process gone.', false);
		});

		this.win_.webContents.on('did-fail-load', async event => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			if ((event as any).isMainFrame) {
				await this.handleAppFailure('Renderer process failed to load', false);
			}
		});

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

		const addWindowEventHandlers = (webContents: WebContents) => {
			// will-frame-navigate is fired by clicking on a link within the BrowserWindow.
			webContents.on('will-frame-navigate', event => {
				// If the link changes the URL of the browser window,
				if (event.isMainFrame) {
					event.preventDefault();
					void bridge().openExternal(event.url);
				}
			});

			// Override calls to window.open and links with target="_blank": Open most in a browser instead
			// of Electron:
			webContents.setWindowOpenHandler((event) => {
				if (event.url === 'about:blank') {
					// Script-controlled pages: Used for opening notes in new windows
					return {
						action: 'allow',
					};
				} else if (event.url.match(/^https?:\/\//)) {
					void bridge().openExternal(event.url);
				}
				return { action: 'deny' };
			});

			webContents.on('did-create-window', (event) => {
				addWindowEventHandlers(event.webContents);
			});
		};
		addWindowEventHandlers(this.win_.webContents);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
					if (this.win_) this.win_.webContents.send('appClose');
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

		ipcMain.on('apply-update-now', () => {
			this.updaterService_.updateApp();
		});

		ipcMain.on('check-for-updates', () => {
			void this.updaterService_.checkForUpdates(true);
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		this.stopPeriodicUpdateCheck();
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public createTray(contextMenu: any) {
		try {
			this.tray_ = new Tray(`${this.buildDir()}/icons/${this.trayIconFilename_()}`);
			this.tray_.setToolTip(this.electronApp_.name);
			this.tray_.setContextMenu(contextMenu);

			this.tray_.on('click', () => {
				if (!this.window()) {
					console.warn('The window object was not available during the click event from tray icon');
					return;
				}
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.electronApp_.on('second-instance', (_e: any, argv: string[]) => {
			const win = this.window();
			if (!win) return;
			if (win.isMinimized()) win.restore();
			win.show();
			// eslint-disable-next-line no-restricted-properties
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

	public initializeCustomProtocolHandler(logger: LoggerWrapper) {
		this.customProtocolHandler_ ??= handleCustomProtocols(logger);
	}

	// Electron's autoUpdater has to be init from the main process
	public initializeAutoUpdaterService(logger: LoggerWrapper, devMode: boolean, includePreReleases: boolean) {
		if (shim.isWindows() || shim.isMac()) {
			if (!this.updaterService_) {
				this.updaterService_ = new AutoUpdaterService(this.win_, logger, devMode, includePreReleases);
				this.startPeriodicUpdateCheck();
			}
		}
	}

	private startPeriodicUpdateCheck = (updateInterval: number = defaultUpdateInterval): void => {
		this.stopPeriodicUpdateCheck();
		this.updatePollInterval_ = setInterval(() => {
			void this.updaterService_.checkForUpdates(false);
		}, updateInterval);
		setTimeout(this.updaterService_.checkForUpdates, initialUpdateStartup);
	};

	private stopPeriodicUpdateCheck = (): void => {
		if (this.updatePollInterval_) {
			clearInterval(this.updatePollInterval_);
			this.updatePollInterval_ = null;
			this.updaterService_ = null;
		}
	};

	public getCustomProtocolHandler() {
		return this.customProtocolHandler_;
	}

	public async start() {
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
			this.quit();
		});

		this.electronApp_.on('activate', () => {
			this.win_.show();
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
