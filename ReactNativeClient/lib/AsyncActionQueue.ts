export interface QueueItemAction {
	(): void,
}

export interface QueueItem {
	action: QueueItemAction,
	context: any,
}

// The AsyncActionQueue can be used to debounce asynchronous actions, to make sure
// they run in the right order, and also to ensure that if multiple actions are emitted
// only the last one are executed. This is particularly useful to save data in the background.
// Each queue should be associated with a specific entity (a note, resource, etc.)
export default class AsyncActionQueue {

	queue_:QueueItem[] = [];
	interval_:number;
	scheduleProcessingIID_:any = null;
	processing_ = false;
	needProcessing_ = false;

	constructor(interval:number = 100) {
		this.interval_ = interval;
	}

	push(action:QueueItemAction, context:any = null) {
		this.queue_.push({
			action: action,
			context: context,
		});
		this.scheduleProcessing();
	}

	get queue():QueueItem[] {
		return this.queue_;
	}

	private scheduleProcessing(interval:number = null) {
		if (interval === null) interval = this.interval_;

		if (this.scheduleProcessingIID_) {
			clearTimeout(this.scheduleProcessingIID_);
		}

		this.scheduleProcessingIID_ = setTimeout(() => {
			this.scheduleProcessingIID_ = null;
			this.processQueue();
		}, interval);
	}

	private async processQueue() {
		if (this.processing_) {
			this.scheduleProcessing();
			return;
		}

		this.processing_ = true;

		const itemCount = this.queue_.length;

		if (itemCount) {
			const item = this.queue_[itemCount - 1];
			await item.action();
			this.queue_.splice(0, itemCount);
		}

		this.processing_ = false;
	}

	waitForAllDone() {
		if (!this.queue_.length) return Promise.resolve();

		this.scheduleProcessing(1);

		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (this.processing_) return;

				if (!this.queue_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}
}

