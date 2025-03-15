import { newHttpError, sendMessage, startServer, stopServer } from './ipc';

describe('ipc', () => {

	it('should send and receive messages', async () => {
		const startPort = 41168;

		const server1 = await startServer(startPort, async (request) => {
			if (request.action === 'testing') {
				return {
					text: 'hello1',
				};
			}

			throw newHttpError(404);
		});

		const server2 = await startServer(startPort, async (request) => {
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

		{
			const responses = await sendMessage(startPort, {
				action: 'testing',
				data: {
					test: 1234,
				},
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
			});

			expect(responses).toEqual([
				{ port: 41169, response: { text: 'hello2' } },
			]);
		}

		await stopServer(server1);
		await stopServer(server2);
	});

});
