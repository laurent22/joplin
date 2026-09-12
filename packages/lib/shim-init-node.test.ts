import { shimInit } from './shim-init-node';
import shim from './shim';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, withExtraRootCa } from './testing/test-utils';
import { copyFile } from 'fs-extra';
import createLocalhostServer from './testing/createLocalhostServer';

describe('shim-init-node', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		shimInit();
	});

	test('should set the correct mime for a PDF file even if the extension is missing', async () => {
		const filePath = `${supportDir}/valid_pdf_without_ext`;
		const resource = await shim.createResourceFromPath(filePath);

		expect(resource.mime).toBe('application/pdf');
	});

	test('should preserve the file extension if one is provided regardless of the mime type', async () => {
		const tempDir = await createTempDir();

		const originalFilePath = `${supportDir}/valid_pdf_without_ext`;
		const fileWithDifferentExtension = `${tempDir}/valid_pdf.mscz`;

		await copyFile(originalFilePath, fileWithDifferentExtension);

		const resource = await shim.createResourceFromPath(fileWithDifferentExtension);

		expect(resource.file_extension).toBe('mscz');
	});

	// https://github.com/laurent22/joplin/issues/16486 - the agent used to be bound once from the
	// initial URL, which made the request fail with ERR_INVALID_PROTOCOL when a redirect switched
	// between http: and https:.
	test('should handle redirects from http to https', async () => {
		await using httpsServer = await createLocalhostServer((_req, res) => {
			res.writeHead(200);
			res.end('success!');
		}, { https: true });
		await using httpServer = await createLocalhostServer((_req, res) => {
			res.writeHead(302, { location: `${httpsServer.baseUrl}/` });
			res.end('done');
		}, { https: false });

		await withExtraRootCa(httpsServer.cert, async () => {
			const response = await shim.fetch(`${httpServer.baseUrl}`);
			expect(response.status).toBe(200);
			expect(await response.text()).toBe('success!');
		});
	});

	test('should expose an agent per protocol', async () => {
		const agents = shim.httpAgents();
		expect(agents.http).toBeTruthy();
		expect(agents.https).toBeTruthy();
		expect(agents.http).not.toBe(agents.https);
		expect(shim.httpAgent('http://example.com')).toBe(agents.http);
		expect(shim.httpAgent('https://example.com')).toBe(agents.https);
	});
});
