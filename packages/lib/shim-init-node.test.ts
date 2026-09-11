import { shimInit } from './shim-init-node';
import shim from './shim';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir } from './testing/test-utils';
import { copyFile } from 'fs-extra';
import * as http from 'http';
import { AddressInfo } from 'net';

const startServer = async (handler: http.RequestListener) => {
	const server = http.createServer(handler);
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
	const port = (server.address() as AddressInfo).port;
	return { server, url: `http://127.0.0.1:${port}` };
};

const closeServer = async (server: http.Server) => {
	await new Promise<void>(resolve => server.close(() => resolve()));
};

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
	// between http: and https:. node-fetch calls the agent function for every hop, so passing a
	// function is what allows the agent to follow the protocol change.
	test('should pass an agent that resolves per protocol rather than a fixed one', async () => {
		const server = await startServer((_req, res) => {
			res.writeHead(200);
			res.end('done');
		});

		// shim.fetch sets `agent` on the options object it is given, so it can be inspected afterwards
		const options: { agent?: unknown } = {};

		try {
			const response = await shim.fetch(`${server.url}/`, options);
			expect(response.status).toBe(200);

			expect(typeof options.agent).toBe('function');

			const agents = shim.httpAgents();
			const resolve = options.agent as (url: { protocol: string })=> unknown;
			expect(resolve({ protocol: 'https:' })).toBe(agents.https);
			expect(resolve({ protocol: 'http:' })).toBe(agents.http);
		} finally {
			await closeServer(server.server);
		}
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
