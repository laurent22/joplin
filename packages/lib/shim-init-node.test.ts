import { shimInit } from './shim-init-node';
import shim from './shim';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, withExtraRootCa } from './testing/test-utils';
import { copyFile, readFile, remove } from 'fs-extra';
import createLocalhostServer from './testing/createLocalhostServer';
import { join } from 'path';

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

	test('should handle https requests', async () => {
		await using httpsServer = await createLocalhostServer((_req, res) => {
			res.writeHead(200);
			res.end('test!');
		}, { https: true });

		await withExtraRootCa(httpsServer.cert, async () => {
			const response = await shim.fetch(`${httpsServer.baseUrl}`);
			expect(response.status).toBe(200);
			expect(await response.text()).toBe('test!');
		});
	});

	test.each([
		200,
		// Should still download the file even for error responses.
		// (Behavior of fetchBlob before migrating to Undici from node-fetch)
		400,
	])('fetchBlob should download a file to disk when the server responds with code %d', async (code) => {
		await using httpServer = await createLocalhostServer((req, res) => {
			if (req.url?.endsWith('/file.txt')) {
				res.writeHead(code, { 'content-type': 'text/plain' });
				res.end('File content');
			} else {
				res.writeHead(404);
				res.end('Not found');
			}
		}, { https: false });

		const tempDir = await createTempDir();
		try {
			const path = join(tempDir, 'test.txt');
			const response = await shim.fetchBlob(`${httpServer.baseUrl}/file.txt`, { path });
			expect(response.status).toBe(code);
			expect(await readFile(path, 'utf-8')).toBe('File content');
		} finally {
			await remove(tempDir);
		}
	});
});
