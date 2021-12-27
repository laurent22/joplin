import Logger from '@joplin/lib/Logger';
import time from '@joplin/lib/time';

const logger = Logger.create('BackOffHandler');

// This handler performs two checks:
//
// 1. If the plugin makes many API calls one after the other, a delay is going
//    to be applied before responding. The delay is set using backOffIntervals_.
//    When a plugin needs to be throttled that way a warning is displayed so
//    that the author gets an opportunity to fix it.
//
// 2. If the plugin makes many simultaneous calls (over 100), the handler throws
//    an exception to stop the plugin. In that case the plugin will be broken,
//    but most plugins will not get this error anyway because call are usually
//    made in sequence. It might reveal a bug though - for example if the plugin
//    makes a call every 1 second, but does not wait for the response (or assume
//    the response will come in less than one second). In that case, the back
//    off intervals combined with the incorrect code will make the plugin fail.

export default class BackOffHandler {

	private backOffIntervals_ = Array(100).fill(0).concat([0, 1, 1, 2, 3, 5, 8]);
	private lastRequestTime_ = 0;
	private pluginId_: string;
	private resetBackOffInterval_ = (this.backOffIntervals_[this.backOffIntervals_.length - 1] + 1) * 1000;
	private backOffIndex_ = 0;
	private waitCount_ = 0;
	private maxWaitCount_ = 100;

	public constructor(pluginId: string) {
		this.pluginId_ = pluginId;
	}

	private backOffInterval() {
		const now = Date.now();

		if (now - this.lastRequestTime_ > this.resetBackOffInterval_) {
			this.backOffIndex_ = 0;
		} else {
			this.backOffIndex_++;
		}

		this.lastRequestTime_ = now;
		const effectiveIndex = this.backOffIndex_ >= this.backOffIntervals_.length ? this.backOffIntervals_.length - 1 : this.backOffIndex_;
		return this.backOffIntervals_[effectiveIndex];
	}

	public async wait(path: string, args: any) {
		const interval = this.backOffInterval();
		if (!interval) return;

		this.waitCount_++;

		logger.warn(`Plugin ${this.pluginId_}: Applying a backoff of ${interval} seconds due to frequent plugin API calls. Consider reducing the number of calls, caching the data, or requesting more data per call. API call was: `, path, args, `[Wait count: ${this.waitCount_}]`);

		if (this.waitCount_ > this.maxWaitCount_) throw new Error(`Plugin ${this.pluginId_}: More than ${this.maxWaitCount_} API alls are waiting - aborting. Please consider queuing the API calls in your plugins to reduce the load on the application.`);

		await time.sleep(interval);

		this.waitCount_--;
	}

}
