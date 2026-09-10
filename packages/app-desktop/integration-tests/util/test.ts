import { resolve, join, dirname } from 'path';
import { remove, mkdirp, readFile, pathExists } from 'fs-extra';
import { _electron as electron, Page, ElectronApplication, test as base, TestInfo } from '@playwright/test';
import uuid from '@joplin/lib/uuid';
import createStartupArgs from './createStartupArgs';
import getMainWindow from './getMainWindow';
import setDarkMode from './setDarkMode';
import evaluateWithRetry from './evaluateWithRetry';


type StartWithPluginsResult = { app: ElectronApplication; mainWindow: Page };

type JoplinFixtures = {
	profileDirectory: string;
	electronApp: ElectronApplication;
	startAppWithPlugins: (pluginPaths: string[])=> Promise<StartWithPluginsResult>;
	startupPluginsLoaded: Promise<void>;
	mainWindow: Page;
};

// A custom fixture that loads an electron app. See
// https://playwright.dev/docs/test-fixtures

const initializeMainWindow = async (electronApp: ElectronApplication) => {
	const mainWindow = await getMainWindow(electronApp);

	// Setting the viewport size helps keep test environments consistent.
	await mainWindow.setViewportSize({
		width: 1300,
		height: 800,
	});

	return mainWindow;
};

const waitForMainMessage = async (electronApp: ElectronApplication, messageId: string) => {
	return evaluateWithRetry(electronApp, ({ ipcMain }, messageId) => {
		return new Promise<void>(resolve => {
			ipcMain.once(messageId, () => resolve());
		});
	}, messageId);
};

const waitForAppLoaded = async (electronApp: ElectronApplication) => {
	await waitForMainMessage(electronApp, 'startup-finished');
};

const waitForStartupPlugins = async (electronApp: ElectronApplication) => {
	await waitForMainMessage(electronApp, 'startup-plugins-loaded');
};

const attachJoplinLog = async (profileDirectory: string, testInfo: TestInfo) => {
	const logFile = join(profileDirectory, 'log.txt');
	if (await pathExists(logFile)) {
		await testInfo.attach('log.txt', {
			body: await readFile(logFile, 'utf8'),
			contentType: 'text/plain',
		});
	} else {
		console.warn('Missing log file');
	}
};

const testDir = dirname(__dirname);

export const test = base.extend<JoplinFixtures>({
	// Playwright fails if we don't use the object destructuring
	// pattern in the first argument.
	//
	// See https://github.com/microsoft/playwright/issues/8798
	//
	// eslint-disable-next-line no-empty-pattern
	profileDirectory: async ({ }, use, testInfo) => {
		const profilePath = resolve(join(testDir, 'test-profile'));
		const profileSubdir = join(profilePath, uuid.createNano());
		await mkdirp(profileSubdir);

		await use(profileSubdir);

		// For debugging purposes, attach the Joplin log file to the test:
		await attachJoplinLog(profileSubdir, testInfo);

		await remove(profileSubdir);
	},

	electronApp: async ({ profileDirectory }, use) => {
		const startupArgs = createStartupArgs(profileDirectory);
		const electronApp = await electron.launch({ args: startupArgs });
		const startupPromise = waitForAppLoaded(electronApp);
		await setDarkMode(electronApp, false);
		await startupPromise;

		await use(electronApp);

		await electronApp.firstWindow();
		await electronApp.close();
	},

	startAppWithPlugins: async ({ profileDirectory }, use) => {
		const startupArgs = createStartupArgs(profileDirectory);
		let electronApp: ElectronApplication;

		await use(async (pluginPaths: string[]) => {
			if (electronApp) {
				throw new Error('Electron app already created');
			}
			electronApp = await electron.launch({
				args: [
					...startupArgs,
					'--dev-plugins',
					pluginPaths.map(path => resolve(testDir, path)).join(','),
				],
			});
			const startupPromise = waitForAppLoaded(electronApp);
			const mainWindowPromise = initializeMainWindow(electronApp);
			await waitForStartupPlugins(electronApp);
			await startupPromise;

			return {
				app: electronApp,
				mainWindow: await mainWindowPromise,
			};
		});

		if (electronApp) {
			await electronApp.firstWindow();
			await electronApp.close();
		}
	},

	startupPluginsLoaded: async ({ electronApp }, use) => {
		await use(waitForStartupPlugins(electronApp));
	},

	mainWindow: async ({ electronApp }, use) => {
		await use(await initializeMainWindow(electronApp));
	},
});

export { default as expect } from './extendedExpect';
