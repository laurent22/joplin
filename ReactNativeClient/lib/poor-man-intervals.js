const { time } = require('lib/time-utils.js');

class PoorManIntervals {
	static setInterval(callback, interval) {
		PoorManIntervals.intervalId_++;

		PoorManIntervals.intervals_.push({
			id: PoorManIntervals.intervalId_,
			callback: callback,
			interval: interval,
			lastIntervalTime: time.unixMs(),
		});

		return PoorManIntervals.intervalId_;
	}

	static setTimeout(callback, interval) {
		PoorManIntervals.intervalId_++;

		PoorManIntervals.intervals_.push({
			id: PoorManIntervals.intervalId_,
			callback: callback,
			interval: interval,
			lastIntervalTime: time.unixMs(),
			oneOff: true,
		});

		return PoorManIntervals.intervalId_;
	}

	static intervalById(id) {
		for (let i = 0; i < PoorManIntervals.intervals_.length; i++) {
			if (PoorManIntervals.intervals_[i].id == id) return PoorManIntervals.intervals_[id];
		}
		return null;
	}

	static clearInterval(id) {
		for (let i = 0; i < PoorManIntervals.intervals_.length; i++) {
			if (PoorManIntervals.intervals_[i].id == id) {
				PoorManIntervals.intervals_.splice(i, 1);
				break;
			}
		}
	}

	static update() {
		// Don't update more than once a second
		if (PoorManIntervals.lastUpdateTime_ + 1000 > time.unixMs()) return;

		for (let i = 0; i < PoorManIntervals.intervals_.length; i++) {
			const interval = PoorManIntervals.intervals_[i];
			const now = time.unixMs();
			if (now - interval.lastIntervalTime >= interval.interval) {
				interval.lastIntervalTime = now;
				interval.callback();
				if (interval.oneOff) {
					this.clearInterval(interval.id);
				}
			}
		}

		PoorManIntervals.lastUpdateTime_ = time.unixMs();
	}
}

PoorManIntervals.lastUpdateTime_ = 0;
PoorManIntervals.intervalId_ = 0;
PoorManIntervals.intervals_ = [];

module.exports = { PoorManIntervals };
