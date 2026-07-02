import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import PythonProcessManager from '../../src/infrastructure/PythonProcessManager';
import {
	ProcessAlreadyRunningError,
	ProcessNotRunningError,
	ProcessStoppedError,
} from '../../src/errors/errors';
import { RankRequest } from '../../src/types/types';

interface MockChildProcess {
	proc: ChildProcess;
	stdin: { write: jest.Mock; end: jest.Mock };
	stdout: EventEmitter;
	stderr: EventEmitter;
}

const makeChildProcess = (): MockChildProcess => {
	const stdin = { write: jest.fn(), end: jest.fn() };
	const stdout = new EventEmitter();
	const stderr = new EventEmitter();
	const proc = Object.assign(new EventEmitter(), {
		stdin,
		stdout,
		stderr,
		kill: jest.fn(),
	});
	return { proc: proc as unknown as ChildProcess, stdin, stdout, stderr };
};

const makeRequest = (overrides: Partial<RankRequest> = {}): RankRequest => ({
	id: 'req-1',
	word: 'glad',
	...overrides,
});

describe('PythonProcessManager', () => {
	test('start spawns the process with the configured executable and script', async () => {
		const { proc } = makeChildProcess();
		const spawnFn = jest.fn().mockReturnValue(proc);
		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			spawnFn,
		);
		await manager.start();
		expect(spawnFn).toHaveBeenCalledWith('python3', ['/path/to/script.py']);
	});

	test('start throws ProcessAlreadyRunningError when called while already running', async () => {
		const { proc } = makeChildProcess();
		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			jest.fn().mockReturnValue(proc),
		);
		await manager.start();
		await expect(manager.start()).rejects.toThrow(ProcessAlreadyRunningError);
	});

	test('send throws ProcessNotRunningError before start is called', async () => {
		const manager = new PythonProcessManager('/path/to/script.py');
		await expect(manager.send(makeRequest())).rejects.toThrow(
			ProcessNotRunningError,
		);
	});

	test('send resolves when stdout emits a matching NDJSON response', async () => {
		const { proc, stdout } = makeChildProcess();
		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			jest.fn().mockReturnValue(proc),
		);
		await manager.start();

		const promise = manager.send(makeRequest({ id: 'abc' }));
		stdout.emit(
			'data',
			Buffer.from(
				`${JSON.stringify({
					id: 'abc',
					results: [{ word: 'happy', score: 0.9 }],
				})}\n`,
			),
		);

		const result = await promise;
		expect(result.id).toBe('abc');
		expect(result.results[0].word).toBe('happy');
	});

	test('assembles a response split across multiple stdout chunks', async () => {
		const { proc, stdout } = makeChildProcess();
		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			jest.fn().mockReturnValue(proc),
		);
		await manager.start();

		const promise = manager.send(makeRequest({ id: 'xyz' }));
		const full = JSON.stringify({ id: 'xyz', results: [] });
		stdout.emit('data', Buffer.from(full.slice(0, 10)));
		stdout.emit('data', Buffer.from(`${full.slice(10)}\n`));

		await expect(promise).resolves.toMatchObject({ id: 'xyz' });
	});

	test('stop rejects all pending requests with ProcessStoppedError', async () => {
		const { proc } = makeChildProcess();
		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			jest.fn().mockReturnValue(proc),
		);
		await manager.start();

		const promise = manager.send(makeRequest());
		await manager.stop();

		await expect(promise).rejects.toThrow(ProcessStoppedError);
	});

	test('stop is idempotent when no process is running', async () => {
		const manager = new PythonProcessManager('/path/to/script.py');
		await expect(manager.stop()).resolves.toBeUndefined();
	});

	test('rejects pending requests when the process exits unexpectedly', async () => {
		const { proc } = makeChildProcess();
		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			jest.fn().mockReturnValue(proc),
		);
		await manager.start();

		const promise = manager.send(makeRequest());
		proc.emit('close');

		await expect(promise).rejects.toThrow(ProcessStoppedError);
	});

	test('stale close event after stop does not corrupt a restarted manager', async () => {
		const first = makeChildProcess();
		const second = makeChildProcess();
		let callCount = 0;
		const spawnFn = jest
			.fn()
			.mockImplementation(() => (callCount++ === 0 ? first.proc : second.proc));

		const manager = new PythonProcessManager(
			'/path/to/script.py',
			'python3',
			spawnFn,
		);
		await manager.start();
		await manager.stop();
		await manager.start();

		// stale close from the first process must not affect the second
		first.proc.emit('close');

		const promise = manager.send(makeRequest({ id: 'after-restart' }));
		second.stdout.emit(
			'data',
			Buffer.from(`${JSON.stringify({ id: 'after-restart', results: [] })}\n`),
		);

		await expect(promise).resolves.toMatchObject({ id: 'after-restart' });
	});
});
