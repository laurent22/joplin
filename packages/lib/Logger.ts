const moment = require('moment');
import time from './time';
const { FsDriverDummy } = require('./fs-driver-dummy.js');
const { sprintf } = require('sprintf-js');
const Mutex = require('async-mutex').Mutex;

const writeToFileMutex_ = new Mutex();

export enum TargetType {
	Database = 'database',
	File = 'file',
	Console = 'console',
}

export enum LogLevel {
	None = 0,
	Error = 10,
	Warn = 20,
	Info = 30,
	Debug = 40,
}

interface TargetOptions {
	level?: LogLevel;
	database?: any;
	console?: any;
	prefix?: string;
	path?: string;
	source?: string;

	// Default message format
	format?: string;

	// If specified, will use this as format if it's an info message
	formatInfo?: string;
}

interface Target extends TargetOptions {
	type: TargetType;
}

export interface LoggerWrapper {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	debug: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	info: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	warn: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	error: Function;
}

class Logger {

	// For backward compatibility
	public static LEVEL_NONE = LogLevel.None;
	public static LEVEL_ERROR = LogLevel.Error;
	public static LEVEL_WARN = LogLevel.Warn;
	public static LEVEL_INFO = LogLevel.Info;
	public static LEVEL_DEBUG = LogLevel.Debug;

	public static fsDriver_: any = null;
	private static globalLogger_: Logger = null;

	private targets_: Target[] = [];
	private level_: LogLevel = LogLevel.Info;
	private lastDbCleanup_: number = time.unixMs();
	private enabled_ = true;

	public static fsDriver() {
		if (!Logger.fsDriver_) Logger.fsDriver_ = new FsDriverDummy();
		return Logger.fsDriver_;
	}

	public get enabled(): boolean {
		return this.enabled_;
	}

	public set enabled(v: boolean) {
		this.enabled_ = v;
	}

	public static initializeGlobalLogger(logger: Logger) {
		this.globalLogger_ = logger;
	}

	public static get globalLogger(): Logger {
		if (!this.globalLogger_) {
			// The global logger normally is initialized early, so we shouldn't
			// end up here. However due to early event handlers, it might happen
			// and in this case we want to know about it. So we print this
			// warning, and also flag the log statements using `[UNINITIALIZED
			// GLOBAL LOGGER]` so that we know from where the incorrect log
			// statement comes from.

			console.warn('Logger: Trying to access globalLogger, but it has not been initialized. Make sure that initializeGlobalLogger() has been called before logging. Will use the console as fallback.');
			const output: any = {
				log: (level: LogLevel, prefix: string, ...object: any[]) => {
					// eslint-disable-next-line no-console
					console.info(`[UNINITIALIZED GLOBAL LOGGER] ${this.levelIdToString(level)}: ${prefix}:`, object);
				},
			};
			return output;

			// throw new Error('Global logger has not been initialized!!');
		}
		return this.globalLogger_;
	}

	public static create(prefix: string): LoggerWrapper {
		return {
			debug: (...object: any[]) => this.globalLogger.log(LogLevel.Debug, prefix, ...object),
			info: (...object: any[]) => this.globalLogger.log(LogLevel.Info, prefix, ...object),
			warn: (...object: any[]) => this.globalLogger.log(LogLevel.Warn, prefix, ...object),
			error: (...object: any[]) => this.globalLogger.log(LogLevel.Error, prefix, ...object),
		};
	}

	public setLevel(level: LogLevel) {
		const previous = this.level_;
		this.level_ = level;
		return previous;
	}

	public level() {
		return this.level_;
	}

	public targets() {
		return this.targets_;
	}

	public addTarget(type: TargetType, options: TargetOptions = null) {
		const target = { type: type };
		for (const n in options) {
			if (!options.hasOwnProperty(n)) continue;
			(target as any)[n] = (options as any)[n];
		}

		this.targets_.push(target);
	}

	public objectToString(object: any) {
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

	public objectsToString(...object: any[]) {
		const output = [];
		for (let i = 0; i < object.length; i++) {
			output.push(`"${this.objectToString(object[i])}"`);
		}
		return output.join(', ');
	}

	public static databaseCreateTableSql() {
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
	public async lastEntries(limit = 100, options: any = null) {
		if (options === null) options = {};
		if (!options.levels) options.levels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];
		if (!options.levels.length) return [];

		for (let i = 0; i < this.targets_.length; i++) {
			const target = this.targets_[i];
			if (target.type === 'database') {
				let sql = `SELECT * FROM logs WHERE level IN (${options.levels.join(',')}) ORDER BY timestamp DESC`;
				if (limit !== null) sql += ` LIMIT ${limit}`;
				return await target.database.selectAll(sql);
			}
		}
		return [];
	}

	public targetLevel(target: Target) {
		if ('level' in target) return target.level;
		return this.level();
	}

	public log(level: LogLevel, prefix: string, ...object: any[]) {
		if (!this.targets_.length || !this.enabled) return;

		for (let i = 0; i < this.targets_.length; i++) {
			const target = this.targets_[i];
			const targetPrefix = prefix ? prefix : target.prefix;

			if (this.targetLevel(target) < level) continue;

			if (target.type === 'console') {
				let fn = 'log';
				if (level === LogLevel.Error) fn = 'error';
				if (level === LogLevel.Warn) fn = 'warn';
				if (level === LogLevel.Info) fn = 'info';
				const consoleObj = target.console ? target.console : console;
				let items: any[] = [];

				if (target.format) {
					const format = level === LogLevel.Info && target.formatInfo ? target.formatInfo : target.format;

					const s = sprintf(format, {
						date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
						level: Logger.levelIdToString(level),
						prefix: targetPrefix || '',
						message: '',
					});

					items = [s.trim()].concat(...object);
				} else {
					const prefixItems = [moment().format('HH:mm:ss')];
					if (targetPrefix) prefixItems.push(targetPrefix);
					items = [`${prefixItems.join(': ')}:`].concat(...object);
				}

				consoleObj[fn](...items);
			} else if (target.type === 'file') {
				const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
				const line = [timestamp];
				if (targetPrefix) line.push(targetPrefix);
				line.push(this.objectsToString(...object));

				// Write to file using a mutex so that log entries appear in the
				// correct order (otherwise, since the async call is not awaited
				// by caller, multiple log call in a row are not guaranteed to
				// appear in the right order). We also can't use a sync call
				// because that would slow down the main process, especially
				// when many log operations are being done (eg. during sync in
				// dev mode).
				// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
				let release: Function = null;
				/* eslint-disable-next-line promise/prefer-await-to-then, @typescript-eslint/ban-types -- Old code before rule was applied, Old code before rule was applied */
				writeToFileMutex_.acquire().then((r: Function) => {
					release = r;
					return Logger.fsDriver().appendFile(target.path, `${line.join(': ')}\n`, 'utf8');
					// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
				}).catch((error: any) => {
					console.error('Cannot write to log file:', error);
					// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
				}).finally(() => {
					if (release) release();
				});
			} else if (target.type === 'database') {
				const msg = [];
				if (targetPrefix) msg.push(targetPrefix);
				msg.push(this.objectsToString(...object));

				const queries = [
					{
						sql: 'INSERT INTO logs (`source`, `level`, `message`, `timestamp`) VALUES (?, ?, ?, ?)',
						params: [target.source, level, msg.join(': '), time.unixMs()],
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

	public error(...object: any[]) {
		return this.log(LogLevel.Error, null, ...object);
	}
	public warn(...object: any[]) {
		return this.log(LogLevel.Warn, null, ...object);
	}
	public info(...object: any[]) {
		return this.log(LogLevel.Info, null, ...object);
	}
	public debug(...object: any[]) {
		return this.log(LogLevel.Debug, null, ...object);
	}

	public static levelStringToId(s: string) {
		if (s === 'none') return LogLevel.None;
		if (s === 'error') return LogLevel.Error;
		if (s === 'warn') return LogLevel.Warn;
		if (s === 'info') return LogLevel.Info;
		if (s === 'debug') return LogLevel.Debug;
		throw new Error(`Unknown log level: ${s}`);
	}

	public static levelIdToString(id: LogLevel) {
		if (id === LogLevel.None) return 'none';
		if (id === LogLevel.Error) return 'error';
		if (id === LogLevel.Warn) return 'warn';
		if (id === LogLevel.Info) return 'info';
		if (id === LogLevel.Debug) return 'debug';
		throw new Error(`Unknown level ID: ${id}`);
	}

	public static levelIds() {
		return [LogLevel.None, LogLevel.Error, LogLevel.Warn, LogLevel.Info, LogLevel.Debug];
	}

}

export default Logger;
