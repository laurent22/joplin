class TaskQueue {

	constructor() {
		this.waitingItems_ = [];
		this.inProgressItems_ = {};
		this.concurrency_ = 3;
		this.processingQueue_ = false;
		this.results_ = {};
	}

	push(task) {
		this.waitingItems_.push(task);
		this.processQueue();
	}

	processQueue() {
		if (this.processingQueue_) return;

		this.processingQueue_ = true;

		while (this.waitingItems_.length > 0 && Object.keys(this.inProgressItems_).length < this.concurrency_) {
			const item = this.waitingItems_.splice(0, 1)[0];
			this.inProgressItems_[item.id] = item;

			item.callback().then(result => {
				delete this.inProgressItems_[item.id];
				this.results_[item.id] = result;
				processQueue();
			}).catch(error => {
				this.results_[item.id] = error;
				processQueue();
			});
		}

		this.processingQueue_ = false;
	}

	async waitForResult(taskId) {
		// const task = this.results_[taskId];
		// if (!task) return
	}

}

module.exports = TaskQueue;