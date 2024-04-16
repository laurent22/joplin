import time from './time';
import Setting from './models/Setting';
import Logger, { LoggerWrapper } from '@joplin/utils/Logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type TaskCallback = ()=> Promise<any>;

interface Task {
	id: string;
	callback: TaskCallback;
}

interface TaskResult {
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	result: any;
	error?: Error;
}

export default class TaskQueue {

	private waitingTasks_: Task[] = [];
	private processingTasks_: Record<string, Task> = {};
	private processingQueue_ = false;
	private stopping_ = false;
	private results_: Record<string, TaskResult> = {};
	private name_: string;
	private logger_: Logger | LoggerWrapper;
	private concurrency_: number = null;
	private keepTaskResults_ = true;

	public constructor(name: string, logger: Logger | LoggerWrapper = null) {
		this.name_ = name;
		this.logger_ = logger ? logger : new Logger();
	}

	public concurrency() {
		if (this.concurrency_ === null) {
			return Setting.value('sync.maxConcurrentConnections');
		} else {
			return this.concurrency_;
		}
	}

	public setConcurrency(v: number) {
		this.concurrency_ = v;
	}

	public get keepTaskResults() {
		return this.keepTaskResults_;
	}

	public set keepTaskResults(v: boolean) {
		this.keepTaskResults_ = v;
	}

	// Using `push`, an unlimited number of tasks can be pushed, although only
	// up to `concurrency` will run in parallel.
	public push(id: string, callback: TaskCallback) {
		if (this.stopping_) throw new Error('Cannot push task when queue is stopping');

		this.waitingTasks_.push({
			id: id,
			callback: callback,
		});
		this.processQueue_();
	}

	// Using `push`, only up to `concurrency` tasks can be pushed to the queue.
	// Beyond this, the call will wait until a slot is available.
	public async pushAsync(id: string, callback: TaskCallback) {
		await this.waitForOneSlot();
		this.push(id, callback);
	}

	private processQueue_() {
		if (this.processingQueue_ || this.stopping_) return;

		this.processingQueue_ = true;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const completeTask = (task: Task, result: any, error: Error) => {
			delete this.processingTasks_[task.id];

			if (this.keepTaskResults) {
				const r: TaskResult = {
					id: task.id,
					result: result,
				};

				if (error) r.error = error;

				this.results_[task.id] = r;
			}

			this.processQueue_();
		};

		while (this.waitingTasks_.length > 0 && Object.keys(this.processingTasks_).length < this.concurrency()) {
			if (this.stopping_) break;

			const task = this.waitingTasks_.splice(0, 1)[0];
			this.processingTasks_[task.id] = task;

			// We want to use then/catch here because we don't want to wait for
			// the task to complete, but still want to capture the result.
			task
				.callback()
				// eslint-disable-next-line promise/prefer-await-to-then, @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.then((result: any) => {
					completeTask(task, result, null);
				})
				// eslint-disable-next-line promise/prefer-await-to-then
				.catch((error: Error) => {
					if (!error) error = new Error('Unknown error');
					completeTask(task, null, error);
				});
		}

		this.processingQueue_ = false;
	}

	public isWaiting(taskId: string) {
		return this.waitingTasks_.find(task => task.id === taskId);
	}

	public isProcessing(taskId: string) {
		return taskId in this.processingTasks_;
	}

	public isDone(taskId: string) {
		return taskId in this.results_;
	}

	public async waitForAll() {
		return new Promise((resolve) => {
			const checkIID = setInterval(() => {
				if (this.waitingTasks_.length) return;
				if (Object.keys(this.processingTasks_).length) return;
				clearInterval(checkIID);
				resolve(null);
			}, 100);
		});
	}

	public async waitForOneSlot() {
		return new Promise((resolve) => {
			const checkIID = setInterval(() => {
				if (Object.keys(this.processingTasks_).length >= this.concurrency()) return;
				clearInterval(checkIID);
				resolve(null);
			}, 100);
		});
	}

	public taskExists(taskId: string) {
		return this.isWaiting(taskId) || this.isProcessing(taskId) || this.isDone(taskId);
	}

	public taskResult(taskId: string) {
		if (!this.taskExists(taskId)) throw new Error(`No such task: ${taskId}`);
		return this.results_[taskId];
	}

	public async waitForResult(taskId: string): Promise<TaskResult> {
		if (!this.taskExists(taskId)) throw new Error(`No such task: ${taskId}`);

		return new Promise(resolve => {
			const check = () => {
				const result = this.results_[taskId];
				if (result) {
					resolve(result);
					return true;
				}
				return false;
			};

			if (check()) return;

			const checkIID = setInterval(() => {
				if (check()) clearInterval(checkIID);
			}, 100);
		});
	}

	public async stop() {
		this.stopping_ = true;

		this.logger_.info(`TaskQueue.stop: ${this.name_}: waiting for tasks to complete: ${Object.keys(this.processingTasks_).length}`);

		// In general it's not a big issue if some tasks are still running because
		// it won't call anything unexpected in caller code, since the caller has
		// to explicitly retrieve the results
		const startTime = Date.now();
		while (Object.keys(this.processingTasks_).length) {
			await time.sleep(0.1);
			if (Date.now() - startTime >= 30000) {
				this.logger_.warn(`TaskQueue.stop: ${this.name_}: timed out waiting for task to complete`);
				break;
			}
		}

		this.logger_.info(`TaskQueue.stop: ${this.name_}: Done, waited for ${Date.now() - startTime}`);
	}

	public isStopping() {
		return this.stopping_;
	}
}
