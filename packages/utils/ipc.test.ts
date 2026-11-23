import { readFile } from 'fs/promises';
import { createTempDir } from './fs.test';
import { IpcMessageHandler, IpcServer, newHttpError, sendMessage, startServer as startServerBase, stopServer } from './ipc';

const getRandomPort = () => {
	// Stay below the OS ephemeral port ranges (Linux: 32768+, macOS/Windows: 49152+), otherwise an outgoing
	// connection may hold the port, which `tcp-port-used` reports as free but `listen()` rejects with EADDRINUSE.
	return Math.floor(Math.random() * 20000) + 10000;
};

let startedServers: IpcServer[] = [];

const startServer = async (startPort: number, secretKeyFilePath: string, messageHandler: IpcMessageHandler) => {
	const server = await startServerBase(startPort, secretKeyFilePath, messageHandler);
	startedServers.push(server);
	return server;
};

describe('ipc', () => {

	afterEach(async () => {
		for (const server of startedServers) await stopServer(server);
		startedServers = [];
	});

	it('should send and receive messages', async () => {
		const tempDir = await createTempDir();
		const secretFilePath = `${tempDir}/secret.txt`;
		const serverPort1 = getRandomPort();
		const serverPort2 = serverPort1 + 5;

		await startServer(serverPort1, secretFilePath, async (request) => {
			if (request.action === 'testing') {
				return {
					text: 'hello1',
				};
			}

			throw newHttpError(404);
		});

		await startServer(serverPort2, secretFilePath, async (request) => {
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
			const responses = await sendMessage(serverPort1, {
				action: 'testing',
				data: {
					test: 1234,
				},
				secretKey,
			});

			expect(responses).toEqual([
				{ port: serverPort1, response: { text: 'hello1' } },
				{ port: serverPort2, response: { text: 'hello2' } },
			]);
		}

		{
			const responses = await sendMessage(serverPort1, {
				action: 'ping',
				data: null,
				secretKey,
			});

			expect(responses).toEqual([
				{ port: serverPort2, response: { text: 'pong' } },
			]);
		}

		{
			const responses = await sendMessage(serverPort1, {
				action: 'testing',
				data: {
					test: 1234,
				},
				sourcePort: serverPort1,
				secretKey,
			});

			expect(responses).toEqual([
				{ port: serverPort2, response: { text: 'hello2' } },
			]);
		}
	});

	it('should not process message if secret is invalid', async () => {
		const tempDir = await createTempDir();
		const secretFilePath = `${tempDir}/secret.txt`;
		const serverPort = getRandomPort();

		await startServer(serverPort, secretFilePath, async (request) => {
			if (request.action === 'testing') {
				return {
					text: 'hello1',
				};
			}

			throw newHttpError(404);
		});

		const secretKey = await readFile(secretFilePath, 'utf-8');

		{
			const responses = await sendMessage(serverPort, {
				action: 'testing',
				data: null,
				secretKey: 'wrong_key',
			});

			expect(responses.length).toBe(0);
		}

		{
			const responses = await sendMessage(serverPort, {
				action: 'testing',
				data: null,
				secretKey,
			});

			expect(responses.length).toBe(1);
		}
	});

});
