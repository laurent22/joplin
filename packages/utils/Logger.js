"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.TargetType = void 0;
const moment = require('moment');
const { sprintf } = require('sprintf-js');
const Mutex = require('async-mutex').Mutex;
const writeToFileMutex_ = new Mutex();
var TargetType;
(function (TargetType) {
    TargetType["Database"] = "database";
    TargetType["File"] = "file";
    TargetType["Console"] = "console";
})(TargetType || (exports.TargetType = TargetType = {}));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["None"] = 0] = "None";
    LogLevel[LogLevel["Error"] = 10] = "Error";
    LogLevel[LogLevel["Warn"] = 20] = "Warn";
    LogLevel[LogLevel["Info"] = 30] = "Info";
    LogLevel[LogLevel["Debug"] = 40] = "Debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const dummyFsDriver = {
    appendFile: (_path, _content, _encoding) => __awaiter(void 0, void 0, void 0, function* () { }),
};
class Logger {
    constructor() {
        this.targets_ = [];
        this.level_ = LogLevel.Info;
        this.lastDbCleanup_ = Date.now();
        this.enabled_ = true;
    }
    static fsDriver() {
        if (!Logger.fsDriver_)
            Logger.fsDriver_ = dummyFsDriver;
        return Logger.fsDriver_;
    }
    get enabled() {
        return this.enabled_;
    }
    set enabled(v) {
        this.enabled_ = v;
    }
    static initializeGlobalLogger(logger) {
        this.globalLogger_ = logger;
    }
    static get globalLogger() {
        if (!this.globalLogger_) {
            // The global logger normally is initialized early, so we shouldn't
            // end up here. However due to early event handlers, it might happen
            // and in this case we want to know about it. So we print this
            // warning, and also flag the log statements using `[UNINITIALIZED
            // GLOBAL LOGGER]` so that we know from where the incorrect log
            // statement comes from.
            console.warn('Logger: Trying to access globalLogger, but it has not been initialized. Make sure that initializeGlobalLogger() has been called before logging. Will use the console as fallback.');
            const output = {
                log: (level, prefix, ...object) => {
                    // eslint-disable-next-line no-console
                    console.info(`[UNINITIALIZED GLOBAL LOGGER] ${this.levelIdToString(level)}: ${prefix}:`, object);
                },
            };
            return output;
            // throw new Error('Global logger has not been initialized!!');
        }
        return this.globalLogger_;
    }
    static create(prefix) {
        return {
            debug: (...object) => this.globalLogger.log(LogLevel.Debug, prefix, ...object),
            info: (...object) => this.globalLogger.log(LogLevel.Info, prefix, ...object),
            warn: (...object) => this.globalLogger.log(LogLevel.Warn, prefix, ...object),
            error: (...object) => this.globalLogger.log(LogLevel.Error, prefix, ...object),
        };
    }
    setLevel(level) {
        const previous = this.level_;
        this.level_ = level;
        return previous;
    }
    level() {
        return this.level_;
    }
    targets() {
        return this.targets_;
    }
    addTarget(type, options = null) {
        const target = { type: type };
        for (const n in options) {
            if (!options.hasOwnProperty(n))
                continue;
            target[n] = options[n];
        }
        this.targets_.push(target);
    }
    objectToString(object) {
        let output = '';
        if (typeof object === 'object') {
            if (object instanceof Error) {
                object = object;
                output = object.toString();
                if (object.code)
                    output += `\nCode: ${object.code}`;
                if (object.headers)
                    output += `\nHeader: ${JSON.stringify(object.headers)}`;
                if (object.request)
                    output += `\nRequest: ${object.request.substr ? object.request.substr(0, 1024) : ''}`;
                if (object.stack)
                    output += `\n${object.stack}`;
            }
            else {
                output = JSON.stringify(object);
            }
        }
        else {
            output = object;
        }
        return output;
    }
    objectsToString(...object) {
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
    lastEntries(limit = 100, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options === null)
                options = {};
            if (!options.levels)
                options.levels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];
            if (!options.levels.length)
                return [];
            for (let i = 0; i < this.targets_.length; i++) {
                const target = this.targets_[i];
                if (target.type === 'database') {
                    let sql = `SELECT * FROM logs WHERE level IN (${options.levels.join(',')}) ORDER BY timestamp DESC`;
                    if (limit !== null)
                        sql += ` LIMIT ${limit}`;
                    return yield target.database.selectAll(sql);
                }
            }
            return [];
        });
    }
    targetLevel(target) {
        if ('level' in target)
            return target.level;
        return this.level();
    }
    log(level, prefix, ...object) {
        if (!this.targets_.length || !this.enabled)
            return;
        for (let i = 0; i < this.targets_.length; i++) {
            const target = this.targets_[i];
            const targetPrefix = prefix ? prefix : target.prefix;
            if (this.targetLevel(target) < level)
                continue;
            if (target.type === 'console') {
                let fn = 'log';
                if (level === LogLevel.Error)
                    fn = 'error';
                if (level === LogLevel.Warn)
                    fn = 'warn';
                if (level === LogLevel.Info)
                    fn = 'info';
                const consoleObj = target.console ? target.console : console;
                let items = [];
                if (target.format) {
                    const format = typeof target.format === 'string' ? target.format : target.format(level, targetPrefix);
                    const s = sprintf(format, {
                        date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                        level: Logger.levelIdToString(level),
                        prefix: targetPrefix || '',
                        message: '',
                    });
                    items = [s.trim()].concat(...object);
                }
                else {
                    const prefixItems = [moment().format('HH:mm:ss')];
                    if (targetPrefix)
                        prefixItems.push(targetPrefix);
                    items = [`${prefixItems.join(': ')}:`].concat(...object);
                }
                consoleObj[fn](...items);
            }
            else if (target.type === 'file') {
                const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
                const line = [timestamp];
                if (targetPrefix)
                    line.push(targetPrefix);
                line.push(this.objectsToString(...object));
                // Write to file using a mutex so that log entries appear in the
                // correct order (otherwise, since the async call is not awaited
                // by caller, multiple log call in a row are not guaranteed to
                // appear in the right order). We also can't use a sync call
                // because that would slow down the main process, especially
                // when many log operations are being done (eg. during sync in
                // dev mode).
                // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
                let release = null;
                /* eslint-disable-next-line promise/prefer-await-to-then, @typescript-eslint/ban-types -- Old code before rule was applied, Old code before rule was applied */
                writeToFileMutex_.acquire().then((r) => {
                    release = r;
                    return Logger.fsDriver().appendFile(target.path, `${line.join(': ')}\n`, 'utf8');
                    // eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
                }).catch((error) => {
                    console.error('Cannot write to log file:', error);
                    // eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
                }).finally(() => {
                    if (release)
                        release();
                });
            }
            else if (target.type === 'database') {
                const msg = [];
                if (targetPrefix)
                    msg.push(targetPrefix);
                msg.push(this.objectsToString(...object));
                const queries = [
                    {
                        sql: 'INSERT INTO logs (`source`, `level`, `message`, `timestamp`) VALUES (?, ?, ?, ?)',
                        params: [target.source, level, msg.join(': '), Date.now()],
                    },
                ];
                const now = Date.now();
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
        return this.log(LogLevel.Error, null, ...object);
    }
    warn(...object) {
        return this.log(LogLevel.Warn, null, ...object);
    }
    info(...object) {
        return this.log(LogLevel.Info, null, ...object);
    }
    debug(...object) {
        return this.log(LogLevel.Debug, null, ...object);
    }
    static levelStringToId(s) {
        if (s === 'none')
            return LogLevel.None;
        if (s === 'error')
            return LogLevel.Error;
        if (s === 'warn')
            return LogLevel.Warn;
        if (s === 'info')
            return LogLevel.Info;
        if (s === 'debug')
            return LogLevel.Debug;
        throw new Error(`Unknown log level: ${s}`);
    }
    static levelIdToString(id) {
        if (id === LogLevel.None)
            return 'none';
        if (id === LogLevel.Error)
            return 'error';
        if (id === LogLevel.Warn)
            return 'warn';
        if (id === LogLevel.Info)
            return 'info';
        if (id === LogLevel.Debug)
            return 'debug';
        throw new Error(`Unknown level ID: ${id}`);
    }
    static levelIds() {
        return [LogLevel.None, LogLevel.Error, LogLevel.Warn, LogLevel.Info, LogLevel.Debug];
    }
}
// For backward compatibility
Logger.LEVEL_NONE = LogLevel.None;
Logger.LEVEL_ERROR = LogLevel.Error;
Logger.LEVEL_WARN = LogLevel.Warn;
Logger.LEVEL_INFO = LogLevel.Info;
Logger.LEVEL_DEBUG = LogLevel.Debug;
Logger.fsDriver_ = null;
Logger.globalLogger_ = null;
exports.default = Logger;
//# sourceMappingURL=Logger.js.map