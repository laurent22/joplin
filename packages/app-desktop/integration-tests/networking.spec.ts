import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import type shim from '@joplin/lib/shim';
import createLocalhostServer from '@joplin/lib/testing/createLocalhostServer';
import { readFile, writeFile } from 'node:fs/promises';
import setSettingValue from './util/setSettingValue';
import { join } from 'node:path';
import { FetchOptions } from '@joplin/lib/shim';

interface ExtendedWindow extends Window {
	joplin: {
		shim: typeof shim;
	};
}

declare const window: ExtendedWindow;

// Networking can behave differently in Electron
test.describe('networking', () => {

	for (const protocol of ['http' as const, 'https' as const]) {
		test(`shim.fetch and shim.fetchBlob should fetch an ${protocol} URL`, async ({ mainWindow, electronApp, profileDirectory }) => {
			const server = await createLocalhostServer((request, response) => {
				response.writeHead(200, { 'content-type': 'application/json' });
				response.end(JSON.stringify({ success: 1, method: request.method }));
			}, { https: protocol === 'https' });
			const targetUrl = `${server.baseUrl}/ping`;

			const tempDir = join(profileDirectory, 'tmp');
			if (protocol === 'https') {
				const certPath = join(profileDirectory, 'test__serverCert.pem');
				await writeFile(certPath, server.cert, 'utf-8');
				await setSettingValue(electronApp, mainWindow, 'net.customCertificates', certPath);
			}

			const mainScreen = await new MainScreen(mainWindow).setup();
			await mainScreen.waitFor();

			const sendFetchRequest = (url: string, options: FetchOptions) => (
				mainWindow.evaluate(async ({ url, options }) => {
					const response = await window.joplin.shim.fetch(url, options);
					return {
						ok: response.ok,
						json: await response.json(),
					};
				}, { url, options })
			);
			expect(await sendFetchRequest(targetUrl, { method: 'GET' })).toMatchObject({
				ok: true,
				json: { success: 1, method: 'GET' },
			});
			expect(await sendFetchRequest(targetUrl, { method: 'POST' })).toMatchObject({
				ok: true,
				json: { success: 1, method: 'POST' },
			});

			const downloadedFile = await mainWindow.evaluate(async ([targetUrl, tempDir]) => {
				const outputPath = `${tempDir}/test.txt`;
				await window.joplin.shim.fetchBlob(targetUrl, { path: outputPath });
				return outputPath;
			}, [targetUrl, tempDir]);
			expect(JSON.parse(await readFile(downloadedFile, 'utf-8'))).toMatchObject({
				success: 1,
				method: 'GET',
			});
		});
	}


});

