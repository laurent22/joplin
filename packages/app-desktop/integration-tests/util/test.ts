import { resolve, join, dirname } from 'path';
import { remove, mkdirp } from 'fs-extra';
import { _electron as electron, Page, ElectronApplication, test as base } from '@playwright/test';
import uuid from '@joplin/lib/uuid';
import createStartupArgs from './createStartupArgs';
import firstNonDevToolsWindow from './firstNonDevToolsWindow';


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

const getAndResizeMainWindow = async (electronApp: ElectronApplication) => {
	const mainWindow = await firstNonDevToolsWindow(electronApp);

	// Setting the viewport size helps keep test environments consistent.
	await mainWindow.setViewportSize({
		width: 1200,
		height: 800,
	});

	return mainWindow;
};

const waitForStartupPlugins = async (electronApp: ElectronApplication) => {
	return electronApp.evaluate(({ ipcMain }) => {
		return new Promise<void>(resolve => {
			ipcMain.once('startup-plugins-loaded', () => resolve());
		});
	});
};

const testDir = dirname(__dirname);

export const test = base.extend<JoplinFixtures>({
	// Playwright fails if we don't use the object destructuring
	// pattern in the first argument.
	//
	// See https://github.com/microsoft/playwright/issues/8798
	//
	// eslint-disable-next-line no-empty-pattern
	profileDirectory: async ({ }, use) => {
		const profilePath = resolve(join(testDir, 'test-profile'));
		const profileSubdir = join(profilePath, uuid.createNano());
		await mkdirp(profileSubdir);

		await use(profileSubdir);

		await remove(profileSubdir);
	},

	electronApp: async ({ profileDirectory }, use) => {
		const startupArgs = createStartupArgs(profileDirectory);
		const electronApp = await electron.launch({ args: startupArgs });

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
			const mainWindowPromise = getAndResizeMainWindow(electronApp);
			await waitForStartupPlugins(electronApp);

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
		await use(await getAndResizeMainWindow(electronApp));
	},
});

export { default as expect } from './extendedExpect';
