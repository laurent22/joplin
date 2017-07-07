import moment from 'moment';
import { _ } from 'lib/locale.js';
import { time } from 'lib/time-utils.js';
import { FsDriverDummy } from 'lib/fs-driver-dummy.js';

class Logger {

	constructor() {
		this.targets_ = [];
		this.level_ = Logger.LEVEL_ERROR;
		this.fileAppendQueue_ = []
	}

	static fsDriver() {
		if (!Logger.fsDriver_) Logger.fsDriver_ = new FsDriverDummy();
		return Logger.fsDriver_;
	}

	setLevel(level) {
		this.level_ = level;
	}

	level() {
		return this.level_;
	}

	clearTargets() {
		this.targets_.clear();
	}

	addTarget(type, options = null) {
		let target = { type: type };
		for (let n in options) {
			if (!options.hasOwnProperty(n)) continue;
			target[n] = options[n];
		}

		this.targets_.push(target);
	}

	objectToString(object) {
		let output = '';

		if (typeof object === 'object') {
			if (object instanceof Error) {
				output = object.toString();
				if (object.stack) output += "\n" + object.stack;
			} else {
				output = JSON.stringify(object);
			}
		} else {
			output = object;
		}

		return output;		
	}

	objectsToString(...object) {
		let output = [];
		for (let i = 0; i < object.length; i++) {
			output.push('"' + this.objectToString(object[i]) + '"');
		}
		return output.join(', ');
	}

	static databaseCreateTableSql() {
		let output = `
		CREATE TABLE IF NOT EXISTS logs (
			id INTEGER PRIMARY KEY,
			source TEXT,
			level INT NOT NULL,
			message TEXT NOT NULL,
			\`timestamp\` INT NOT NULL
		);
		`;
		return output.split("\n").join(' ');
	}

	// Only for database at the moment
	async lastEntries(limit = 100) {
		for (let i = 0; i < this.targets_.length; i++) {
			const target = this.targets_[i];
			if (target.type == 'database') {
				return await target.database.selectAll('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ' + limit);
			}
		}
		return [];
	}

	log(level, ...object) {
		if (this.level() < level || !this.targets_.length) return;

		let levelString = '';
		let line = moment().format('YYYY-MM-DD HH:mm:ss') + ': ';

		if (level == Logger.LEVEL_WARN) levelString += '[warn] ';
		if (level == Logger.LEVEL_ERROR) levelString += '[error] ';

		for (let i = 0; i < this.targets_.length; i++) {
			let target = this.targets_[i];
			if (target.type == 'console') {
				let fn = 'debug';
				if (level = Logger.LEVEL_ERROR) fn = 'error';
				if (level = Logger.LEVEL_WARN) fn = 'warn';
				if (level = Logger.LEVEL_INFO) fn = 'info';
				console[fn](line + this.objectsToString(...object));
			} else if (target.type == 'file') {
				let serializedObject = this.objectsToString(...object);
				Logger.fsDriver().appendFileSync(target.path, line + serializedObject + "\n");
			} else if (target.type == 'vorpal') {
				target.vorpal.log(...object);
			} else if (target.type == 'database') {
				let msg = this.objectsToString(...object);
				target.database.exec('INSERT INTO logs (`source`, `level`, `message`, `timestamp`) VALUES (?, ?, ?, ?)', [target.source, level, msg, time.unixMs()]);
			}
		}
	}

	error(...object) { return this.log(Logger.LEVEL_ERROR, ...object); }
	warn(...object)  { return this.log(Logger.LEVEL_WARN, ...object); }
	info(...object)  { return this.log(Logger.LEVEL_INFO, ...object); }
	debug(...object) { return this.log(Logger.LEVEL_DEBUG, ...object); }

	static levelStringToId(s) {
		if (s == 'none') return Logger.LEVEL_NONE;
		if (s == 'error') return Logger.LEVEL_ERROR;
		if (s == 'warn') return Logger.LEVEL_WARN;
		if (s == 'info') return Logger.LEVEL_INFO;
		if (s == 'debug') return Logger.LEVEL_DEBUG;
		throw new Error(_('Unknown log level: %s', s));
	}

}

Logger.LEVEL_NONE = 0;
Logger.LEVEL_ERROR = 10;
Logger.LEVEL_WARN = 20;
Logger.LEVEL_INFO = 30;
Logger.LEVEL_DEBUG = 40;

export { Logger };