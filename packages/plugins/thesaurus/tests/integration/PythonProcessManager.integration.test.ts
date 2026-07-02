import * as path from 'path';
import PythonProcessManager from '../../src/infrastructure/PythonProcessManager';

describe('PythonProcessManager integration', () => {
	const echoScript = path.join(__dirname, 'echo_server.py');
	let manager: PythonProcessManager;

	beforeEach(async () => {
		manager = new PythonProcessManager(echoScript);
		await manager.start();
	});

	afterEach(async () => {
		await manager.stop();
	});

	test('sends a request and receives a correlated response', async () => {
		const response = await manager.send({ id: 'int-1', word: 'glad' });
		expect(response.id).toBe('int-1');
		expect(Array.isArray(response.results)).toBe(true);
	});

	test('handles concurrent requests and correlates responses by id', async () => {
		const [r1, r2] = await Promise.all([
			manager.send({ id: 'id-1', word: 'happy' }),
			manager.send({ id: 'id-2', word: 'sad' }),
		]);
		expect(r1.id).toBe('id-1');
		expect(r2.id).toBe('id-2');
	});
});
