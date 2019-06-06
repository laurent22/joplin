const { time } = require('lib/time-utils.js');
const JoplinError = require('lib/JoplinError');
const Setting = require('lib/models/Setting');

class TaskQueue {

	constructor() {
		this.waitingTasks_ = [];
		this.processingTasks_ = {};
		this.processingQueue_ = false;
		this.destroying_ = false;
		this.results_ = {};
	}

	concurrency() {
		return Setting.value('sync.maxConcurrentConnections');
	}

	push(id, callback) {
		if (this.destroying_) throw new Error('Cannot push task when queue is being destroyed');

		this.waitingTasks_.push({
			id: id,
			callback: callback,
		});
		this.processQueue_();
	}

	processQueue_() {
		if (this.processingQueue_ || this.destroying_) return;

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
		}

		while (this.waitingTasks_.length > 0 && Object.keys(this.processingTasks_).length < this.concurrency()) {
			if (this.destroying_) break;

			const task = this.waitingTasks_.splice(0, 1)[0];
			this.processingTasks_[task.id] = task;

			task.callback().then(result => {
				completeTask(task, result, null);
			}).catch(error => {
				if (!error) error = new Error('Unknown error');
				completeTask(task, null, error);
			});
		}

		this.processingQueue_ = false;
	}

	isWaiting(taskId) {
		return this.waitingTasks_.find(task => task.id === taskId)
	}

	isProcessing(taskId) {
		return taskId in this.processingTasks_;
	}

	isDone(taskId) {
		return taskId in this.results_;
	}

	async waitForResult(taskId) {
		if (!this.isWaiting(taskId) && !this.isProcessing(taskId) && !this.isDone(taskId)) throw new Error('No such task: ' + taskId);

		while (true) {
			// if (this.destroying_) {
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

	async destroy() {
		this.destroying_ = true;

		while (Object.keys(this.processingTasks_).length) {
			await time.sleep(0.1);
		}
	}

}

TaskQueue.CONCURRENCY = 5;

module.exports = TaskQueue;