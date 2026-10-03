import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import createLocalhostServer from '@joplin/lib/testing/createLocalhostServer';
import setSettingValue from './util/setSettingValue';
import { ElectronApplication, Page } from '@playwright/test';
import scheduleSync from './util/scheduleSync';

interface ServerMockOptions {
	webLoginUrl: ()=> string|null;
}

const mockJoplinServer = ({ webLoginUrl }: ServerMockOptions) => {
	return createLocalhostServer((request, response) => {
		const url = new URL(request.url ?? 'http://localhost/');

		let jsonResponse: unknown = {};
		let status = 400;
		if (url.pathname === '/api/web_login_base_url') {
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

const enableJoplinServerSync = async (electronApp: ElectronApplication, mainWindow: Page) => {
	await setSettingValue(electronApp, mainWindow, 'sync.target', 9);
};

test.describe('joplinServerAuth', () => {
	test('should show a warning banner when Joplin Server credentials are invalid or missing', async ({ mainWindow, electronApp }) => {
		await using server = await mockJoplinServer({
			webLoginUrl: () => `${server.baseUrl}/login`,
		});

		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		await enableJoplinServerSync(electronApp, mainWindow);
		await scheduleSync(mainWindow);

		await expect(mainScreen.warningBanner).toBeVisible();
		await expect(mainScreen.warningBanner).toHaveText(/^Your Joplin Server credentials are invalid/);

		// Should link to the login screen
		const logInLink = mainScreen.warningBanner.getByRole('link', { name: 'Log in to Joplin Server' });
		await logInLink.click();
		await expect(mainWindow.getByText('Copy link to website')).toBeVisible();
	});
});

