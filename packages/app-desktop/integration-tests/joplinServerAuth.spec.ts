import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import createLocalhostServer from '@joplin/lib/testing/createLocalhostServer';
import setSettingValue from './util/setSettingValue';
import { ElectronApplication, Page } from '@playwright/test';
import scheduleSync from './util/scheduleSync';
import JoplinOAuthLoginScreen from './models/JoplinOAuthLoginScreen';

interface ServerMockOptions {
	webLoginUrl: ()=> string|null;
}

const mockJoplinServer = ({ webLoginUrl }: ServerMockOptions) => {
	return createLocalhostServer((request, response) => {
		let jsonResponse: unknown = {};
		let status = 400;
		if (request.url?.endsWith('/api/web_login_base_url')) {
			const redirectUrl = webLoginUrl();
			if (!redirectUrl) {
				status = 404;
			} else {
				status = 200;
				jsonResponse = { uri: redirectUrl };
			}
		}

		response.writeHead(status, { 'content-type': 'application/json' });
		response.end(JSON.stringify(jsonResponse));
	}, { https: false });
};

const enableJoplinServerSync = async (electronApp: ElectronApplication, mainWindow: Page, joplinServerUrl: string) => {
	await setSettingValue(electronApp, mainWindow, 'sync.target', 9);
	await setSettingValue(electronApp, mainWindow, 'sync.9.path', joplinServerUrl);
};

test.describe('joplinServerAuth', () => {
	test('should show a warning banner when Joplin Server credentials are invalid or missing', async ({ mainWindow, electronApp }) => {
		await using server = await mockJoplinServer({
			webLoginUrl: () => `${server.baseUrl}/login`,
		});

		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		await enableJoplinServerSync(electronApp, mainWindow, server.baseUrl);
		// Clicking the sync button directly would open the login screen without first showing a warning
		await scheduleSync(mainWindow);

		await expect(mainScreen.warningBanner).toBeVisible();
		await expect(mainScreen.warningBanner).toHaveText(/^Your Joplin Server credentials are invalid/);

		// Should link to the login screen
		const logInLink = mainScreen.warningBanner.getByRole('link', { name: 'Log in to Joplin Server' });
		await logInLink.click();
		await new JoplinOAuthLoginScreen(mainWindow).waitFor();
	});

	test('clicking the sync button should open the login screen when logged out', async ({ mainWindow, electronApp }) => {
		await using server = await mockJoplinServer({
			webLoginUrl: () => `${server.baseUrl}/login`,
		});

		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		await enableJoplinServerSync(electronApp, mainWindow, server.baseUrl);
		await mainScreen.sidebar.syncButton.click();

		await new JoplinOAuthLoginScreen(mainWindow).waitFor();
	});

	for (const { label, newAuthSystem } of [
		{
			label: 'should show the username/password auth fields if the new auth system is unsupported',
			newAuthSystem: false,
		},
		{
			label: 'should show the Joplin Server login screen if the new auth system is supported',
			newAuthSystem: true,
		},
	]) {
		test(`clicking "Connect to Joplin Server" ${label}`, async ({ mainWindow, electronApp }) => {
			await using server = await mockJoplinServer({
				webLoginUrl: () => (
					newAuthSystem ? `${server.baseUrl}/login` : null
				),
			});

			const mainScreen = await new MainScreen(mainWindow).setup();
			await mainScreen.waitFor();

			await enableJoplinServerSync(electronApp, mainWindow, server.baseUrl);

			const settingsScreen = await mainScreen.openSettings(electronApp);
			await settingsScreen.waitFor();
			const syncTab = await settingsScreen.openSyncTab();

			await expect(syncTab.joplinServerUsernameInput).not.toBeVisible();
			await syncTab.connectToJoplinServerButton.click();

			if (newAuthSystem) {
				await new JoplinOAuthLoginScreen(mainWindow).waitFor();
			} else {
				await expect(syncTab.joplinServerUsernameInput).toBeVisible();
			}
		});
	}
});

