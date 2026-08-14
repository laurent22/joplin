import { Interceptable, MockAgent, setGlobalDispatcher } from 'undici';
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
		setGlobalDispatcher(mockAgent);
		mockPool = mockAgent.get('http://127.0.0.1:22300');

		shimInit();
		shim.httpAgent = () => mockAgent;

		tempDir = await createTempDir();
	});

	afterEach(async () => {
		await remove(tempDir);
	});

	test('fetchBlob should download a file', async () => {
		mockPool.intercept({
			path: '/file.txt',
			method: 'GET',
		}).reply(200, 'This is a test!');

		const path = join(tempDir, 'test.txt');
		const response = await shim.fetchBlob('http://127.0.0.1:22300/file.txt', { path });
		expect(response.status).toBe(200);
		expect(await readFile(path, 'utf-8')).toBe('This is a test!');
	});
});
