import { readFile } from 'fs/promises';
import { createTempDir } from './fs.test';
import { newHttpError, sendMessage, startServer, stopServer } from './ipc';

describe('ipc', () => {

	it('should send and receive messages', async () => {
		const tempDir = await createTempDir();
		const secretFilePath = `${tempDir}/secret.txt`;
		const startPort = 41168;

		const server1 = await startServer(startPort, secretFilePath, async (request) => {
			if (request.action === 'testing') {
				return {
					text: 'hello1',
				};
			}

			throw newHttpError(404);
		});

		const server2 = await startServer(startPort, secretFilePath, async (request) => {
			if (request.action === 'testing') {
				return {
					text: 'hello2',
				};
			}

			if (request.action === 'ping') {
				return {
					text: 'pong',
				};
			}

			throw newHttpError(404);
		});

		const secretKey = await readFile(secretFilePath, 'utf-8');

		{
			const responses = await sendMessage(startPort, {
				action: 'testing',
				data: {
					test: 1234,
				},
				secretKey,
			});

			expect(responses).toEqual([
				{ port: 41168, response: { text: 'hello1' } },
				{ port: 41169, response: { text: 'hello2' } },
			]);
		}

		{
			const responses = await sendMessage(startPort, {
				action: 'ping',
				data: null,
				secretKey,
			});

			expect(responses).toEqual([
				{ port: 41169, response: { text: 'pong' } },
			]);
		}

		{
			const responses = await sendMessage(startPort, {
				action: 'testing',
				data: {
					test: 1234,
				},
				sourcePort: 41168,
				secretKey,
			});

			expect(responses).toEqual([
				{ port: 41169, response: { text: 'hello2' } },
			]);
		}

		await stopServer(server1);
		await stopServer(server2);
	});

	it('should not process message if secret is invalid', async () => {
		const tempDir = await createTempDir();
		const secretFilePath = `${tempDir}/secret.txt`;
		const startPort = 41168;

		const server = await startServer(startPort, secretFilePath, async (request) => {
			if (request.action === 'testing') {
				return {
					text: 'hello1',
				};
			}

			throw newHttpError(404);
		});

		const secretKey = await readFile(secretFilePath, 'utf-8');

		{
			const responses = await sendMessage(startPort, {
				action: 'testing',
				data: null,
				secretKey: 'wrong_key',
			});

			expect(responses.length).toBe(0);
		}

		{
			const responses = await sendMessage(startPort, {
				action: 'testing',
				data: null,
				secretKey,
			});

			expect(responses.length).toBe(1);
		}

		await stopServer(server);
	});

});
