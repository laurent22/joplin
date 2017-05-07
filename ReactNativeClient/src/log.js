// Custom wrapper for `console` to allow for custom logging (to file, etc.) if needed.

class Log {

	static info(...o) {
		console.info(...o);
	}

	static warn(...o) {
		console.info(...o);
	}

	static error(...o) {
		console.info(...o);
	}

}

export { Log };