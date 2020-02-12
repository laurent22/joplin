const { time } = require('lib/time-utils.js');
const Setting = require('lib/models/Setting');
const { Logger } = require('lib/logger.js');

class TaskQueue {
	constructor(name) {
		this.waitingTasks_ = [];
		this.processingTasks_ = {};
		this.processingQueue_ = false;
		this.stopping_ = false;
		this.results_ = {};
		this.name_ = name;
		this.logger_ = new Logger();
	}

	concurrency() {
		return Setting.value('sync.maxConcurrentConnections');
	}

	push(id, callback) {
		if (this.stopping_) throw new Error('Cannot push task when queue is stopping');

		this.waitingTasks_.push({
			id: id,
			callback: callback,
		});
		this.processQueue_();
	}

	processQueue_() {
		if (this.processingQueue_ || this.stopping_) return;

		this.processingQueue_ = true;

		const completeTask = (task, result, error) => {
			delete this.processingTasks_[task.id];

			const r = {
				id: task.id,
				result: result,
			};

			if (error) r.error = error;

			this.results_[task.id] = r;

			this.processQueue_();
		};

		while (this.waitingTasks_.length > 0 && Object.keys(this.processingTasks_).length < this.concurrency()) {
			if (this.stopping_) break;

			const task = this.waitingTasks_.splice(0, 1)[0];
			this.processingTasks_[task.id] = task;

			task
				.callback()
				.then(result => {
					completeTask(task, result, null);
				})
				.catch(error => {
					if (!error) error = new Error('Unknown error');
					completeTask(task, null, error);
				});
		}

		this.processingQueue_ = false;
	}

	isWaiting(taskId) {
		return this.waitingTasks_.find(task => task.id === taskId);
	}

	isProcessing(taskId) {
		return taskId in this.processingTasks_;
	}

	isDone(taskId) {
		return taskId in this.results_;
	}

	async waitForResult(taskId) {
		if (!this.isWaiting(taskId) && !this.isProcessing(taskId) && !this.isDone(taskId)) throw new Error(`No such task: ${taskId}`);

		while (true) {
			// if (this.stopping_) {
			// 	return {
			// 		id: taskId,
			// 		error: new JoplinError('Queue has been destroyed', 'destroyedQueue'),
			// 	};
			// }

			const task = this.results_[taskId];
			if (task) return task;
			await time.sleep(0.1);
		}
	}

	async stop() {
		this.stopping_ = true;

		this.logger_.info(`TaskQueue.stop: ${this.name_}: waiting for tasks to complete: ${Object.keys(this.processingTasks_).length}`);

		// In general it's not a big issue if some tasks are still running because
		// it won't call anything unexpected in caller code, since the caller has
		// to explicitely retrieve the results
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

	isStopping() {
		return this.stopping_;
	}
}

TaskQueue.CONCURRENCY = 5;

module.exports = TaskQueue;
