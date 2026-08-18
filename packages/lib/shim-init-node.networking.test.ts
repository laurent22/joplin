import { Interceptable, MockAgent } from '@joplin/bundled-undici';
import { shimInit } from './shim-init-node';
import shim from './shim';
import { createTempDir } from './testing/test-utils';
import { join } from 'path';
import { readFile, remove } from 'fs-extra';

describe('shim-init-node.networking', () => {
	let mockAgent: MockAgent<MockAgent.Options>;
	let mockPool: Interceptable;
	let tempDir: string;
	beforeEach(async () => {
		mockAgent = new MockAgent();
		mockPool = mockAgent.get('http://127.0.0.1:22300');

		shimInit();
		shim.httpAgent = () => mockAgent;

		tempDir = await createTempDir();
	});

	afterEach(async () => {
		await remove(tempDir);
	});

	test.each([
		200,
		// Should still download the file for error responses (matches the
		// behavior of fetchBlob before switching to an undici implementation)
		400,
	])('should download a file to disk when the server responds with code %d', async (code) => {
		mockPool.intercept({
			path: '/file.txt',
			method: 'GET',
		}).reply(code, 'This is a test!');

		const path = join(tempDir, 'test.txt');
		const response = await shim.fetchBlob('http://127.0.0.1:22300/file.txt', { path });
		expect(response.status).toBe(code);
		expect(await readFile(path, 'utf-8')).toBe('This is a test!');
	});
});
