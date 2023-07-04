import shim from './shim';

export interface QueueItemAction {
	(): void;
}

export interface QueueItem {
	action: QueueItemAction;
	context: any;
}

export enum IntervalType {
	Debounce = 1,
	Fixed = 2,
}

// The AsyncActionQueue can be used to debounce asynchronous actions, to make sure
// they run in the right order, and also to ensure that if multiple actions are emitted
// only the last one is executed. This is particularly useful to save data in the background.
// Each queue should be associated with a specific entity (a note, resource, etc.)
export default class AsyncActionQueue {

	private queue_: QueueItem[] = [];
	private interval_: number;
	private intervalType_: number;
	private scheduleProcessingIID_: any = null;
	private processing_ = false;

	public constructor(interval = 100, intervalType: IntervalType = IntervalType.Debounce) {
		this.interval_ = interval;
		this.intervalType_ = intervalType;
	}

	public push(action: QueueItemAction, context: any = null) {
		this.queue_.push({
			action: action,
			context: context,
		});
		this.scheduleProcessing();
	}

	public get isEmpty(): boolean {
		return !this.queue_.length;
	}

	private scheduleProcessing(interval: number = null) {
		if (interval === null) interval = this.interval_;

		if (this.scheduleProcessingIID_) {
			if (this.intervalType_ === IntervalType.Fixed) return;
			shim.clearTimeout(this.scheduleProcessingIID_);
		}

		this.scheduleProcessingIID_ = shim.setTimeout(() => {
			this.scheduleProcessingIID_ = null;
			void this.processQueue();
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

	public async reset() {
		if (this.scheduleProcessingIID_) {
			shim.clearTimeout(this.scheduleProcessingIID_);
			this.scheduleProcessingIID_ = null;
		}

		this.queue_ = [];
		return this.waitForAllDone();
	}

	// Currently waitForAllDone() already finishes all the actions
	// as quickly as possible so we can make it an alias.
	public async processAllNow() {
		return this.waitForAllDone();
	}

	public async waitForAllDone() {
		if (!this.queue_.length) return Promise.resolve();

		this.scheduleProcessing(1);

		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (this.processing_) return;

				if (!this.queue_.length) {
					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}
}

