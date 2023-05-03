// There are plenty of packages for in-memory caching but each have their
// own gotchas and often have extra complexity which makes it work in one
// platform but not in another (for example, the use of long timeouts would
// be fine in Node but not in React Native).
//
// So this class implements a simple in-memory cache with support for TTL.
// Checking for expired keys is a bit inefficient since it doesn't rely on
// timers, so it's checking every time a value is set or retrieved. But it
// should be fine in most cases, as long as the class is not used at a massive
// scale.

interface Record {
	value: any;
	expiredTime: number;
}

interface Records {
	[key: string]: Record;
}

interface ExpirableKeys {
	[key: string]: boolean;
}

export default class Cache {

	private maxRecords_: number;
	private records_: Records = {};
	private expirableKeys_: ExpirableKeys = {};
	private recordKeyHistory_: string[] = [];

	public constructor(maxRecords: number = 50) {
		this.maxRecords_ = maxRecords;
	}

	private checkExpiredRecords() {
		const now = Date.now();

		for (const key in this.expirableKeys_) {
			if (!this.records_[key]) {
				delete this.expirableKeys_[key];
			} else {
				if (this.records_[key].expiredTime <= now) {
					delete this.records_[key];
					delete this.expirableKeys_[key];
				}
			}
		}

		while (this.recordKeyHistory_.length > this.maxRecords_) {
			const key = this.recordKeyHistory_[0];
			delete this.records_[key];
			delete this.expirableKeys_[key];
			this.recordKeyHistory_.splice(0, 1);
		}
	}

	public value(key: string, defaultValue: any = undefined): any {
		this.checkExpiredRecords();
		if (key in this.records_) return this.records_[key].value;

		return defaultValue;
	}

	public setValue(key: string, value: any, ttl: number = 0) {
		this.checkExpiredRecords();

		this.records_[key] = {
			value: value,
			expiredTime: ttl ? Date.now() + ttl : 0,
		};

		const idx = this.recordKeyHistory_.indexOf(key);
		if (idx >= 0) this.recordKeyHistory_.splice(idx, 1);
		this.recordKeyHistory_.push(key);

		if (ttl) {
			this.expirableKeys_[key] = true;
		} else {
			delete this.expirableKeys_[key];
		}
	}

}
