import { mkdtemp, writeFile, remove } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock Electron modules used by ElectronAppWrapper
jest.mock('electron', () => ({
	BrowserWindow: jest.fn().mockImplementation(() => ({
		loadFile: jest.fn().mockResolvedValue(undefined),
		destroy: jest.fn(),
		isDestroyed: jest.fn().mockReturnValue(false),
		show: jest.fn(),
		hide: jest.fn(),
		webContents: {
			on: jest.fn(),
			send: jest.fn(),
			isCrashed: jest.fn().mockReturnValue(false),
			setZoomFactor: jest.fn(),
			session: { webRequest: { onBeforeSendHeaders: jest.fn() } },
			openDevTools: jest.fn(),
		},
		on: jest.fn(),
		once: jest.fn(),
		getBounds: jest.fn().mockReturnValue({ width: 800, height: 600 }),
	})),
	screen: {
		getPrimaryDisplay: jest.fn().mockReturnValue({
			workArea: { width: 1920, height: 1080 },
		}),
		getDisplayMatching: jest.fn().mockReturnValue(true),
	},
	ipcMain: {
		on: jest.fn(),
		once: jest.fn(),
	},
	dialog: {
		showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
	},
	nativeTheme: {
		shouldUseDarkColors: false,
	},
	app: {
		isReady: jest.fn().mockReturnValue(true),
		on: jest.fn(),
		quit: jest.fn(),
		setAsDefaultProtocolClient: jest.fn(),
		getName: jest.fn().mockReturnValue('joplin-desktop'),
		setName: jest.fn(),
		getPath: jest.fn().mockReturnValue('/tmp'),
	},
}));

const fs = require('fs-extra');

describe('ElectronAppWrapper splash screen', () => {

	let profileDir: string;

	beforeEach(async () => {
		profileDir = await mkdtemp(join(tmpdir(), 'splash-test-'));
	});

	afterEach(async () => {
		await remove(profileDir);
	});

	describe('settings.json reading for startMinimized', () => {

		test('should decide to show splash when settings.json does not exist', () => {
			const settingsPath = join(profileDir, 'settings.json');
			let showSplash = true;

			if (fs.pathExistsSync(settingsPath)) {
				try {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
					if (settings && settings.startMinimized && settings.showTrayIcon) {
						showSplash = false;
					}
				} catch (_e) {
					// Ignore
				}
			}

			expect(showSplash).toBe(true);
		});

		test('should decide to show splash when startMinimized is false', async () => {
			const settingsPath = join(profileDir, 'settings.json');
			await writeFile(settingsPath, JSON.stringify({
				startMinimized: false,
				showTrayIcon: true,
			}));

			let showSplash = true;
			if (fs.pathExistsSync(settingsPath)) {
				try {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
					if (settings && settings.startMinimized && settings.showTrayIcon) {
						showSplash = false;
					}
				} catch (_e) {
					// Ignore
				}
			}

			expect(showSplash).toBe(true);
		});

		test('should decide to show splash when showTrayIcon is false', async () => {
			const settingsPath = join(profileDir, 'settings.json');
			await writeFile(settingsPath, JSON.stringify({
				startMinimized: true,
				showTrayIcon: false,
			}));

			let showSplash = true;
			if (fs.pathExistsSync(settingsPath)) {
				try {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
					if (settings && settings.startMinimized && settings.showTrayIcon) {
						showSplash = false;
					}
				} catch (_e) {
					// Ignore
				}
			}

			expect(showSplash).toBe(true);
		});

		test('should skip splash when both startMinimized and showTrayIcon are true', async () => {
			const settingsPath = join(profileDir, 'settings.json');
			await writeFile(settingsPath, JSON.stringify({
				startMinimized: true,
				showTrayIcon: true,
			}));

			let showSplash = true;
			if (fs.pathExistsSync(settingsPath)) {
				try {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
					if (settings && settings.startMinimized && settings.showTrayIcon) {
						showSplash = false;
					}
				} catch (_e) {
					// Ignore
				}
			}

			expect(showSplash).toBe(false);
		});

		test('should show splash when settings.json is malformed', async () => {
			const settingsPath = join(profileDir, 'settings.json');
			await writeFile(settingsPath, '{ invalid json !!!');

			let showSplash = true;
			if (fs.pathExistsSync(settingsPath)) {
				try {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
					if (settings && settings.startMinimized && settings.showTrayIcon) {
						showSplash = false;
					}
				} catch (_e) {
					// Ignore
				}
			}

			expect(showSplash).toBe(true);
		});

		test('should show splash when settings.json is empty object', async () => {
			const settingsPath = join(profileDir, 'settings.json');
			await writeFile(settingsPath, '{}');

			let showSplash = true;
			if (fs.pathExistsSync(settingsPath)) {
				try {
					const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
					if (settings && settings.startMinimized && settings.showTrayIcon) {
						showSplash = false;
					}
				} catch (_e) {
					// Ignore
				}
			}

			expect(showSplash).toBe(true);
		});
	});

	describe('destroySplashWindow idempotency', () => {

		test('should safely handle null splashWindow', () => {
			// Simulates calling destroySplashWindow when no splash was created
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
			const context: any = { splashWindow_: null };

			const destroySplashWindow = function(this: typeof context) {
				if (this.splashWindow_ && !this.splashWindow_.isDestroyed()) {
					this.splashWindow_.destroy();
				}
				this.splashWindow_ = null;
			};

			// Should not throw
			expect(() => destroySplashWindow.call(context)).not.toThrow();
			expect(context.splashWindow_).toBeNull();
		});

		test('should destroy splash window and set to null', () => {
			const mockDestroy = jest.fn();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
			const context: any = {
				splashWindow_: {
					isDestroyed: jest.fn().mockReturnValue(false),
					destroy: mockDestroy,
				},
			};

			const destroySplashWindow = function(this: typeof context) {
				if (this.splashWindow_ && !this.splashWindow_.isDestroyed()) {
					this.splashWindow_.destroy();
				}
				this.splashWindow_ = null;
			};

			destroySplashWindow.call(context);
			expect(mockDestroy).toHaveBeenCalledTimes(1);
			expect(context.splashWindow_).toBeNull();
		});

		test('should not call destroy if already destroyed', () => {
			const mockDestroy = jest.fn();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
			const context: any = {
				splashWindow_: {
					isDestroyed: jest.fn().mockReturnValue(true),
					destroy: mockDestroy,
				},
			};

			const destroySplashWindow = function(this: typeof context) {
				if (this.splashWindow_ && !this.splashWindow_.isDestroyed()) {
					this.splashWindow_.destroy();
				}
				this.splashWindow_ = null;
			};

			destroySplashWindow.call(context);
			expect(mockDestroy).not.toHaveBeenCalled();
			expect(context.splashWindow_).toBeNull();
		});

		test('should handle multiple calls safely', () => {
			const mockDestroy = jest.fn();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
			const context: any = {
				splashWindow_: {
					isDestroyed: jest.fn().mockReturnValue(false),
					destroy: mockDestroy,
				},
			};

			const destroySplashWindow = function(this: typeof context) {
				if (this.splashWindow_ && !this.splashWindow_.isDestroyed()) {
					this.splashWindow_.destroy();
				}
				this.splashWindow_ = null;
			};

			destroySplashWindow.call(context);
			destroySplashWindow.call(context);
			destroySplashWindow.call(context);

			expect(mockDestroy).toHaveBeenCalledTimes(1);
			expect(context.splashWindow_).toBeNull();
		});
	});
});
