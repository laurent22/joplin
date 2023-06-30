// On mobile all the setTimeout and setInterval should go through this class
// as it will either use the native timeout/interval for short intervals or
// the custom one for long intervals.

// For custom intervals, they are triggered
// whenever the update() function is called, and in mobile it's called for
// example on the Redux action middleware or when the app gets focus.

import time from './time';

type IntervalId = number;

interface Interval {
	id: IntervalId;
	callback: Function;
	interval: number;
	lastIntervalTime: number;
	isTimeout: boolean;
}

interface Intervals {
	[key: number]: Interval;
}

export default class PoorManIntervals {

	private static maxNativeTimerDuration_ = 10 * 1000;
	private static lastUpdateTime_ = 0;
	private static intervalId_: IntervalId = 0;
	private static intervals_: Intervals = {};

	public static setInterval(callback: Function, interval: number): IntervalId {
		if (interval <= this.maxNativeTimerDuration_) return setInterval(callback, interval);

		this.intervalId_++;
		const id = this.intervalId_;

		this.intervals_[id] = {
			id: id,
			callback: callback,
			interval: interval,
			lastIntervalTime: time.unixMs(),
			isTimeout: false,
		};

		return id;
	}

	public static setTimeout(callback: Function, interval: number): IntervalId {
		if (interval <= this.maxNativeTimerDuration_) return setTimeout(callback, interval);

		this.intervalId_++;
		const id = this.intervalId_;

		this.intervals_[id] = {
			id: id,
			callback: callback,
			interval: interval,
			lastIntervalTime: time.unixMs(),
			isTimeout: true,
		};

		return id;
	}

	public static clearInterval(id: IntervalId) {
		const r = this.intervals_[id];
		if (!r) {
			clearInterval(id);
		} else {
			delete this.intervals_[id];
		}
	}

	public static clearTimeout(id: IntervalId) {
		const r = this.intervals_[id];
		if (!r) {
			clearTimeout(id);
		} else {
			delete this.intervals_[id];
		}
	}

	public static update() {
		// Don't update more than once a second
		if (this.lastUpdateTime_ + 1000 > time.unixMs()) return;

		for (const id in this.intervals_) {
			const interval = this.intervals_[id];
			const now = time.unixMs();
			if (now - interval.lastIntervalTime >= interval.interval) {
				interval.lastIntervalTime = now;
				interval.callback();
				if (interval.isTimeout) {
					this.clearTimeout(interval.id);
				}
			}
		}

		this.lastUpdateTime_ = time.unixMs();
	}
}
