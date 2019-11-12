const moment = require('moment');
const { _ } = require('lib/locale.js');
const { time } = require('lib/time-utils.js');
const { FsDriverDummy } = require('lib/fs-driver-dummy.js');

class Logger {
	constructor() {
		this.targets_ = [];
		this.level_ = Logger.LEVEL_INFO;
		this.fileAppendQueue_ = [];
		this.lastDbCleanup_ = time.unixMs();
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

	targets() {
		return this.targets_;
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
				if (object.code) output += `\nCode: ${object.code}`;
				if (object.headers) output += `\nHeader: ${JSON.stringify(object.headers)}`;
				if (object.request) output += `\nRequest: ${object.request.substr ? object.request.substr(0, 1024) : ''}`;
				if (object.stack) output += `\n${object.stack}`;
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
			output.push(`"${this.objectToString(object[i])}"`);
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
		return output.split('\n').join(' ');
	}

	// Only for database at the moment
	async lastEntries(limit = 100, options = null) {
		if (options === null) options = {};
		if (!options.levels) options.levels = [Logger.LEVEL_DEBUG, Logger.LEVEL_INFO, Logger.LEVEL_WARN, Logger.LEVEL_ERROR];
		if (!options.levels.length) return [];

		for (let i = 0; i < this.targets_.length; i++) {
			const target = this.targets_[i];
			if (target.type == 'database') {
				let sql = `SELECT * FROM logs WHERE level IN (${options.levels.join(',')}) ORDER BY timestamp DESC`;
				if (limit !== null) sql += ` LIMIT ${limit}`;
				return await target.database.selectAll(sql);
			}
		}
		return [];
	}

	targetLevel(target) {
		if ('level' in target) return target.level;
		return this.level();
	}

	log(level, ...object) {
		if (!this.targets_.length) return;

		let line = `${moment().format('YYYY-MM-DD HH:mm:ss')}: `;

		for (let i = 0; i < this.targets_.length; i++) {
			let target = this.targets_[i];

			if (this.targetLevel(target) < level) continue;

			if (target.type == 'console') {
				let fn = 'log';
				if (level == Logger.LEVEL_ERROR) fn = 'error';
				if (level == Logger.LEVEL_WARN) fn = 'warn';
				if (level == Logger.LEVEL_INFO) fn = 'info';
				const consoleObj = target.console ? target.console : console;
				consoleObj[fn](line + this.objectsToString(...object));
			} else if (target.type == 'file') {
				let serializedObject = this.objectsToString(...object);
				try {
					Logger.fsDriver().appendFileSync(target.path, `${line + serializedObject}\n`);
				} catch (error) {
					console.error('Cannot write to log file:', error);
				}
			} else if (target.type == 'database') {
				let msg = this.objectsToString(...object);

				let queries = [
					{
						sql: 'INSERT INTO logs (`source`, `level`, `message`, `timestamp`) VALUES (?, ?, ?, ?)',
						params: [target.source, level, msg, time.unixMs()],
					},
				];

				const now = time.unixMs();
				if (now - this.lastDbCleanup_ > 1000 * 60 * 60) {
					this.lastDbCleanup_ = now;
					const dayKeep = 14;
					queries.push({
						sql: 'DELETE FROM logs WHERE `timestamp` < ?',
						params: [now - 1000 * 60 * 60 * 24 * dayKeep],
					});
				}

				target.database.transactionExecBatch(queries);
			}
		}
	}

	error(...object) {
		return this.log(Logger.LEVEL_ERROR, ...object);
	}
	warn(...object) {
		return this.log(Logger.LEVEL_WARN, ...object);
	}
	info(...object) {
		return this.log(Logger.LEVEL_INFO, ...object);
	}
	debug(...object) {
		return this.log(Logger.LEVEL_DEBUG, ...object);
	}

	static levelStringToId(s) {
		if (s == 'none') return Logger.LEVEL_NONE;
		if (s == 'error') return Logger.LEVEL_ERROR;
		if (s == 'warn') return Logger.LEVEL_WARN;
		if (s == 'info') return Logger.LEVEL_INFO;
		if (s == 'debug') return Logger.LEVEL_DEBUG;
		throw new Error(_('Unknown log level: %s', s));
	}

	static levelIdToString(id) {
		if (id == Logger.LEVEL_NONE) return 'none';
		if (id == Logger.LEVEL_ERROR) return 'error';
		if (id == Logger.LEVEL_WARN) return 'warn';
		if (id == Logger.LEVEL_INFO) return 'info';
		if (id == Logger.LEVEL_DEBUG) return 'debug';
		throw new Error(_('Unknown level ID: %s', id));
	}

	static levelIds() {
		return [Logger.LEVEL_NONE, Logger.LEVEL_ERROR, Logger.LEVEL_WARN, Logger.LEVEL_INFO, Logger.LEVEL_DEBUG];
	}

	static levelEnum() {
		let output = {};
		const ids = this.levelIds();
		for (let i = 0; i < ids.length; i++) {
			output[ids[i]] = this.levelIdToString(ids[i]);
		}
		return output;
	}
}

Logger.LEVEL_NONE = 0;
Logger.LEVEL_ERROR = 10;
Logger.LEVEL_WARN = 20;
Logger.LEVEL_INFO = 30;
Logger.LEVEL_DEBUG = 40;

module.exports = { Logger };
