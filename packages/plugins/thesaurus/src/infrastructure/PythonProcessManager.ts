import { spawn, ChildProcess } from 'child_process';
import { PythonProcessManagerApi } from 'src/interfaces/IPythonProcessManager';
import { RankRequest, RankResponse, PendingRequest } from '../types/types';
import {
	ProcessAlreadyRunningError,
	ProcessNotRunningError,
	ProcessStoppedError,
} from '../errors/errors';

type SpawnFn = (command: string, args: string[])=> ChildProcess;

export default class PythonProcessManager implements PythonProcessManagerApi {
	private process: ChildProcess | null = null;
	private pendingRequests = new Map<string, PendingRequest>();
	private stdoutBuffer = '';

	public constructor(
		private readonly scriptPath: string,
		private readonly pythonExecutable = 'python3',
		private readonly spawnFn: SpawnFn = (cmd, args) =>
			spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] }),
	) {}

	public async start(): Promise<void> {
		if (this.process !== null) {
			throw new ProcessAlreadyRunningError();
		}

		const proc = this.spawnFn(this.pythonExecutable, [this.scriptPath]);
		proc.stdout!.on('data', (chunk: Buffer) => this.handleStdoutData(chunk));
		proc.stderr!.on('data', (chunk: Buffer) => {
			console.error('[PythonProcessManager] stderr:', chunk.toString());
		});
		// Guard against stale listeners firing after stop() + start()
		proc.on('close', () => {
			if (this.process === proc) { this.handleProcessExit(new ProcessStoppedError()); }
		});
		proc.on('error', (error: Error) => {
			if (this.process === proc) this.handleProcessExit(error);
		});
		this.process = proc;
	}

	public async stop(): Promise<void> {
		if (this.process === null) return;
		this.rejectAllPending(new ProcessStoppedError());
		this.process.stdin!.end();
		this.process.kill('SIGTERM');
		this.process = null;
		this.stdoutBuffer = '';
	}

	public async send(request: RankRequest): Promise<RankResponse> {
		if (this.process === null) {
			throw new ProcessNotRunningError();
		}
		return new Promise<RankResponse>((resolve, reject) => {
			this.pendingRequests.set(request.id, { resolve, reject });
			this.process!.stdin!.write(`${JSON.stringify(request)}\n`);
		});
	}

	private handleStdoutData(chunk: Buffer): void {
		this.stdoutBuffer += chunk.toString();
		const lines = this.stdoutBuffer.split('\n');
		// last element is a trailing partial line or empty string — retain it
		this.stdoutBuffer = lines.pop()!;
		for (const line of lines) {
			if (line.trim()) this.dispatchLine(line);
		}
	}

	private dispatchLine(line: string): void {
		let response: RankResponse;
		try {
			response = JSON.parse(line) as RankResponse;
		} catch (_e) {
			console.error(
				'[PythonProcessManager] failed to parse response line:',
				line,
			);
			return;
		}

		const pending = this.pendingRequests.get(response.id);
		if (!pending) {
			console.error(
				'[PythonProcessManager] no pending request for id:',
				response.id,
			);
			return;
		}

		this.pendingRequests.delete(response.id);
		pending.resolve(response);
	}

	private handleProcessExit(reason: Error): void {
		this.process = null;
		this.stdoutBuffer = '';
		this.rejectAllPending(reason);
	}

	private rejectAllPending(reason: Error): void {
		for (const pending of this.pendingRequests.values()) {
			pending.reject(reason);
		}
		this.pendingRequests.clear();
	}
}
