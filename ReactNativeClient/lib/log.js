// Custom wrapper for `console` to allow for custom logging (to file, etc.) if needed.

class Log {

	static setLevel(v) {
		this.level_ = v;
	}

	static level() {
		return this.level_ === undefined ? Log.LEVEL_DEBUG : this.level_;
	}

	static debug(...o) {
		if (Log.level() > Log.LEVEL_DEBUG) return;
		console.info(...o);
	}

	static info(...o) {
		if (Log.level() > Log.LEVEL_INFO) return;
		console.info(...o);
	}

	static warn(...o) {
		if (Log.level() > Log.LEVEL_WARN) return;
		console.info(...o);
	}

	static error(...o) {
		if (Log.level() > Log.LEVEL_ERROR) return;
		console.info(...o);
	}

}

Log.LEVEL_DEBUG = 0;
Log.LEVEL_INFO = 10;
Log.LEVEL_WARN = 20;
Log.LEVEL_ERROR = 30;

module.exports = { Log };