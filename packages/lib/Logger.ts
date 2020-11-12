const moment = require('moment');
const time = require('./time').default;
const { FsDriverDummy } = require('./fs-driver-dummy.js');

export enum TargetType {
	Database = 'database',
	File = 'file',
	Console = 'console',
}

enum LogLevel {
	None = 0,
	Error = 10,
	Warn = 20,
	Info = 30,
	Debug = 40,
}

interface Target {
	type: TargetType;
	level?: LogLevel;
	database?: any;
	console?: any;
	prefix?: string;
	path?: string;
	source?: string;
}

class Logger {

	// For backward compatibility
	public static LEVEL_NONE = LogLevel.None;
	public static LEVEL_ERROR = LogLevel.Error;
	public static LEVEL_WARN = LogLevel.Warn;
	public static LEVEL_INFO = LogLevel.Info;
	public static LEVEL_DEBUG = LogLevel.Debug;

	public static fsDriver_: any = null;

	private targets_: Target[] = [];
	private level_: LogLevel = LogLevel.Info;
	private lastDbCleanup_: number = time.unixMs();

	static fsDriver() {
		if (!Logger.fsDriver_) Logger.fsDriver_ = new FsDriverDummy();
		return Logger.fsDriver_;
	}

	setLevel(level: LogLevel) {
		this.level_ = level;
	}

	level() {
		return this.level_;
	}

	targets() {
		return this.targets_;
	}

	addTarget(type: TargetType, options: any = null) {
		const target = { type: type };
		for (const n in options) {
			if (!options.hasOwnProperty(n)) continue;
			(target as any)[n] = options[n];
		}

		this.targets_.push(target);
	}

	objectToString(object: any) {
		let output = '';

		if (typeof object === 'object') {
			if (object instanceof Error) {
				object = object as any;
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

	objectsToString(...object: any[]) {
		const output = [];
		for (let i = 0; i < object.length; i++) {
			output.push(`"${this.objectToString(object[i])}"`);
		}
		return output.join(', ');
	}

	static databaseCreateTableSql() {
		const output = `
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
	async lastEntries(limit: number = 100, options: any = null) {
		if (options === null) options = {};
		if (!options.levels) options.levels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];
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

	targetLevel(target: Target) {
		if ('level' in target) return target.level;
		return this.level();
	}

	log(level: LogLevel, ...object: any[]) {
		if (!this.targets_.length) return;

		const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
		const line = `${timestamp}: `;

		for (let i = 0; i < this.targets_.length; i++) {
			const target = this.targets_[i];

			if (this.targetLevel(target) < level) continue;

			if (target.type == 'console') {
				let fn = 'log';
				if (level == LogLevel.Error) fn = 'error';
				if (level == LogLevel.Warn) fn = 'warn';
				if (level == LogLevel.Info) fn = 'info';
				const consoleObj = target.console ? target.console : console;
				let items = [moment().format('HH:mm:ss')];
				if (target.prefix) {
					items.push(target.prefix);
				}
				items = items.concat(...object);
				consoleObj[fn](...items);
			} else if (target.type == 'file') {
				const serializedObject = this.objectsToString(...object);
				try {
					Logger.fsDriver().appendFileSync(target.path, `${line + serializedObject}\n`);
				} catch (error) {
					console.error('Cannot write to log file:', error);
				}
			} else if (target.type == 'database') {
				const msg = this.objectsToString(...object);

				const queries = [
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

	error(...object: any[]) {
		return this.log(LogLevel.Error, ...object);
	}
	warn(...object: any[]) {
		return this.log(LogLevel.Warn, ...object);
	}
	info(...object: any[]) {
		return this.log(LogLevel.Info, ...object);
	}
	debug(...object: any[]) {
		return this.log(LogLevel.Debug, ...object);
	}

	static levelStringToId(s: string) {
		if (s == 'none') return LogLevel.None;
		if (s == 'error') return LogLevel.Error;
		if (s == 'warn') return LogLevel.Warn;
		if (s == 'info') return LogLevel.Info;
		if (s == 'debug') return LogLevel.Debug;
		throw new Error(`Unknown log level: ${s}`);
	}

	static levelIdToString(id: LogLevel) {
		if (id == LogLevel.None) return 'none';
		if (id == LogLevel.Error) return 'error';
		if (id == LogLevel.Warn) return 'warn';
		if (id == LogLevel.Info) return 'info';
		if (id == LogLevel.Debug) return 'debug';
		throw new Error(`Unknown level ID: ${id}`);
	}

	static levelIds() {
		return [LogLevel.None, LogLevel.Error, LogLevel.Warn, LogLevel.Info, LogLevel.Debug];
	}

}

export default Logger;
