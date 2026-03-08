import { mkdtemp, writeFile, remove } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import shouldShowSplash from './utils/shouldShowSplash';

describe('ElectronAppWrapper splash screen', () => {

	let profileDir: string;

	beforeEach(async () => {
		profileDir = await mkdtemp(join(tmpdir(), 'splash-test-'));
	});

	afterEach(async () => {
		await remove(profileDir);
	});

	test.each([
		['settings.json does not exist', undefined, true],
		['startMinimized is false', { startMinimized: false, showTrayIcon: true }, true],
		['showTrayIcon is false', { startMinimized: true, showTrayIcon: false }, true],
		['both startMinimized and showTrayIcon are true', { startMinimized: true, showTrayIcon: true }, false],
		['settings.json is empty object', {}, true],
	])('shouldShowSplash when %s', async (_label, settings, expected) => {
		if (settings !== undefined) {
			await writeFile(join(profileDir, 'settings.json'), JSON.stringify(settings));
		}
		expect(shouldShowSplash(profileDir)).toBe(expected);
	});

	test('shouldShowSplash when settings.json is malformed', async () => {
		await writeFile(join(profileDir, 'settings.json'), '{ invalid json !!!');
		expect(shouldShowSplash(profileDir)).toBe(true);
	});

	test('destroySplashWindow should safely handle null splashWindow', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
		const context: any = { splashWindow_: null };

		// Duplicated from ElectronAppWrapper.destroySplashWindow for
		// isolated testing without Electron dependencies.
		const destroySplashWindow = function(this: typeof context) {
			if (this.splashWindow_ && !this.splashWindow_.isDestroyed()) {
				this.splashWindow_.destroy();
			}
			this.splashWindow_ = null;
		};

		expect(() => destroySplashWindow.call(context)).not.toThrow();
		expect(context.splashWindow_).toBeNull();
	});

	test('destroySplashWindow should destroy window and set to null', () => {
		const mockDestroy = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
		const context: any = {
			splashWindow_: {
				isDestroyed: jest.fn().mockReturnValue(false),
				destroy: mockDestroy,
			},
		};

		// Duplicated from ElectronAppWrapper.destroySplashWindow for
		// isolated testing without Electron dependencies.
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

	test('destroySplashWindow should skip destroy if already destroyed', () => {
		const mockDestroy = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
		const context: any = {
			splashWindow_: {
				isDestroyed: jest.fn().mockReturnValue(true),
				destroy: mockDestroy,
			},
		};

		// Duplicated from ElectronAppWrapper.destroySplashWindow for
		// isolated testing without Electron dependencies.
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

	test('destroySplashWindow should handle multiple calls safely', () => {
		const mockDestroy = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing internal state
		const context: any = {
			splashWindow_: {
				isDestroyed: jest.fn().mockReturnValue(false),
				destroy: mockDestroy,
			},
		};

		// Duplicated from ElectronAppWrapper.destroySplashWindow for
		// isolated testing without Electron dependencies.
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
