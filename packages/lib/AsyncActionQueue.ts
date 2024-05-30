import Logger from '@joplin/utils/Logger';
import shim from './shim';

export interface QueueItemAction<Context> {
	(context: Context): void|Promise<void>;
}

export interface QueueItem<Context> {
	action: QueueItemAction<Context>;
	context: Context;
}

export enum IntervalType {
	Debounce = 1,
	Fixed = 2,
}

type CanSkipTaskHandler<Context> = (current: QueueItem<Context>, next: QueueItem<Context>)=> boolean;

const logger = Logger.create('AsyncActionQueue');

// The AsyncActionQueue can be used to debounce asynchronous actions, to make sure
// they run in the right order, and also to ensure that if multiple actions are emitted
// only the last one is executed. This is particularly useful to save data in the background.
// Each queue should be associated with a specific entity (a note, resource, etc.)
export default class AsyncActionQueue<Context = void> {

	private queue_: QueueItem<Context>[] = [];
	private interval_: number;
	private intervalType_: number;
	private scheduleProcessingIID_: ReturnType<typeof shim.setInterval>|null = null;
	private processing_ = false;

	private processingFinishedPromise_: Promise<void>;
	private onProcessingFinished_: ()=> void;

	public constructor(interval = 100, intervalType: IntervalType = IntervalType.Debounce) {
		this.interval_ = interval;
		this.intervalType_ = intervalType;
		this.resetFinishProcessingPromise_();
	}

	private resetFinishProcessingPromise_() {
		this.processingFinishedPromise_ = new Promise<void>(resolve => {
			this.onProcessingFinished_ = resolve;
		});
	}

	// Determines whether an item can be skipped in the queue. Prevents data loss in the case that
	// tasks that do different things are added to the queue.
	private canSkipTaskHandler_: CanSkipTaskHandler<Context> = (_current, _next) => true;
	public setCanSkipTaskHandler(callback: CanSkipTaskHandler<Context>) {
		this.canSkipTaskHandler_ = callback;
	}

	public push(action: QueueItemAction<Context>, context: Context = null) {
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

		const itemCount = this.queue_.length;

		if (itemCount) {
			this.processing_ = true;

			let i = 0;
			try {
				for (i = 0; i < itemCount; i++) {
					const current = this.queue_[i];
					const next = i + 1 < itemCount ? this.queue_[i + 1] : null;
					if (!next || !this.canSkipTaskHandler_(current, next)) {
						await current.action(current.context);
					}
				}
			} catch (error) {
				i ++; // Don't repeat the failed task.
				logger.warn('Unhandled error:', error);
				throw error;
			} finally {
				// Removing processed items in a try {} finally {...} prevents
				// items from being processed twice, even if one throws an Error.
				this.queue_.splice(0, i);
				this.processing_ = false;
			}
		}

		if (this.queue_.length === 0) {
			this.onProcessingFinished_();
			this.resetFinishProcessingPromise_();
		}
	}

	public async reset() {
		if (this.scheduleProcessingIID_) {
			shim.clearTimeout(this.scheduleProcessingIID_);
			this.scheduleProcessingIID_ = null;
		}

		this.queue_ = [];
		return this.processAllNow();
	}

	public async processAllNow() {
		this.scheduleProcessing(1);
		return this.waitForAllDone();
	}

	public async waitForAllDone() {
		if (!this.queue_.length) return Promise.resolve();
		return this.processingFinishedPromise_;
	}
}
