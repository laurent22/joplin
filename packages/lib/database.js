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
const Logger_1 = require("./Logger");
const time_1 = require("./time");
const shim_1 = require("./shim");
const Mutex = require('async-mutex').Mutex;
class Database {
    constructor(driver) {
        this.debugMode_ = false;
        this.sqlQueryLogEnabled_ = false;
        this.logger_ = new Logger_1.default();
        this.logExcludedQueryTypes_ = [];
        this.batchTransactionMutex_ = new Mutex();
        this.profilingEnabled_ = false;
        this.queryId_ = 1;
        this.driver_ = driver;
    }
    setLogExcludedQueryTypes(v) {
        this.logExcludedQueryTypes_ = v;
    }
    // Converts the SQLite error to a regular JS error
    // so that it prints a stacktrace when passed to
    // console.error()
    sqliteErrorToJsError(error, sql = null, params = null) {
        return this.driver().sqliteErrorToJsError(error, sql, params);
    }
    setLogger(l) {
        this.logger_ = l;
    }
    logger() {
        return this.logger_;
    }
    driver() {
        return this.driver_;
    }
    open(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.driver().open(options);
            }
            catch (error) {
                throw new Error(`Cannot open database: ${error.message}: ${JSON.stringify(options)}`);
            }
            this.logger().info('Database was open successfully');
        });
    }
    escapeField(field) {
        if (field == '*')
            return '*';
        const p = field.split('.');
        if (p.length == 1)
            return `\`${field}\``;
        if (p.length == 2)
            return `${p[0]}.\`${p[1]}\``;
        throw new Error(`Invalid field format: ${field}`);
    }
    escapeFields(fields) {
        if (fields == '*')
            return '*';
        const output = [];
        for (let i = 0; i < fields.length; i++) {
            output.push(this.escapeField(fields[i]));
        }
        return output;
    }
    tryCall(callName, inputSql, inputParams) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = null;
            let params = null;
            if (typeof inputSql === 'object') {
                params = inputSql.params;
                sql = inputSql.sql;
            }
            else {
                params = inputParams;
                sql = inputSql;
            }
            let waitTime = 50;
            let totalWaitTime = 0;
            const callStartTime = Date.now();
            let profilingTimeoutId = null;
            while (true) {
                try {
                    this.logQuery(sql, params);
                    const queryId = this.queryId_++;
                    if (this.profilingEnabled_) {
                        console.info(`SQL START ${queryId}`, sql, params);
                        profilingTimeoutId = shim_1.default.setInterval(() => {
                            console.warn(`SQL ${queryId} has been running for ${Date.now() - callStartTime}: ${sql}`);
                        }, 3000);
                    }
                    const result = yield this.driver()[callName](sql, params);
                    if (this.profilingEnabled_) {
                        shim_1.default.clearInterval(profilingTimeoutId);
                        profilingTimeoutId = null;
                        const elapsed = Date.now() - callStartTime;
                        if (elapsed > 10)
                            console.info(`SQL END ${queryId}`, elapsed, sql, params);
                    }
                    return result; // No exception was thrown
                }
                catch (error) {
                    if (error && (error.code == 'SQLITE_IOERR' || error.code == 'SQLITE_BUSY')) {
                        if (totalWaitTime >= 20000)
                            throw this.sqliteErrorToJsError(error, sql, params);
                        // NOTE: don't put logger statements here because it might log to the database, which
                        // could result in an error being thrown again.
                        // this.logger().warn(sprintf('Error %s: will retry in %s milliseconds', error.code, waitTime));
                        // this.logger().warn('Error was: ' + error.toString());
                        yield time_1.default.msleep(waitTime);
                        totalWaitTime += waitTime;
                        waitTime *= 1.5;
                    }
                    else {
                        throw this.sqliteErrorToJsError(error, sql, params);
                    }
                }
                finally {
                    if (profilingTimeoutId)
                        shim_1.default.clearInterval(profilingTimeoutId);
                }
            }
        });
    }
    selectOne(sql, params = null) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.tryCall('selectOne', sql, params);
        });
    }
    loadExtension( /* path */) {
        return __awaiter(this, void 0, void 0, function* () {
            return; // Disabled for now as fuzzy search extension is not in use
            // let result =  null;
            // try {
            // 	result = await this.driver().loadExtension(path);
            // 	return result;
            // } catch (e) {
            // 	throw new Error(`Could not load extension ${path}`);
            // }
        });
    }
    selectAll(sql, params = null) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.tryCall('selectAll', sql, params);
        });
    }
    selectAllFields(sql, params, field) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.tryCall('selectAll', sql, params);
            const output = [];
            for (let i = 0; i < rows.length; i++) {
                const v = rows[i][field];
                if (!v)
                    throw new Error(`No such field: ${field}. Query was: ${sql}`);
                output.push(rows[i][field]);
            }
            return output;
        });
    }
    exec(sql, params = null) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.tryCall('exec', sql, params);
        });
    }
    transactionExecBatch(queries) {
        return __awaiter(this, void 0, void 0, function* () {
            if (queries.length <= 0)
                return;
            if (queries.length == 1) {
                const q = this.wrapQuery(queries[0]);
                yield this.exec(q.sql, q.params);
                return;
            }
            // There can be only one transaction running at a time so use a	mutex
            const release = yield this.batchTransactionMutex_.acquire();
            try {
                yield this.exec('BEGIN TRANSACTION');
                for (let i = 0; i < queries.length; i++) {
                    const query = this.wrapQuery(queries[i]);
                    yield this.exec(query.sql, query.params);
                }
                yield this.exec('COMMIT');
            }
            catch (error) {
                yield this.exec('ROLLBACK');
                throw error;
            }
            finally {
                release();
            }
        });
    }
    static enumId(type, s) {
        if (type == 'settings') {
            if (s == 'int')
                return 1;
            if (s == 'string')
                return 2;
        }
        if (type == 'fieldType') {
            if (s)
                s = s.toUpperCase();
            if (s == 'INTEGER')
                s = 'INT';
            if (!(`TYPE_${s}` in this))
                throw new Error(`Unkonwn fieldType: ${s}`);
            return this[`TYPE_${s}`];
        }
        if (type == 'syncTarget') {
            if (s == 'memory')
                return 1;
            if (s == 'filesystem')
                return 2;
            if (s == 'onedrive')
                return 3;
        }
        throw new Error(`Unknown enum type or value: ${type}, ${s}`);
    }
    static enumName(type, id) {
        if (type === 'fieldType') {
            if (id === Database.TYPE_UNKNOWN)
                return 'unknown';
            if (id === Database.TYPE_INT)
                return 'int';
            if (id === Database.TYPE_TEXT)
                return 'text';
            if (id === Database.TYPE_NUMERIC)
                return 'numeric';
            throw new Error(`Invalid type id: ${id}`);
        }
        // Or maybe an error should be thrown
        return undefined;
    }
    static formatValue(type, value) {
        if (value === null || value === undefined)
            return null;
        if (type == this.TYPE_INT)
            return Number(value);
        if (type == this.TYPE_TEXT)
            return value;
        if (type == this.TYPE_NUMERIC)
            return Number(value);
        throw new Error(`Unknown type: ${type}`);
    }
    sqlStringToLines(sql) {
        const output = [];
        const lines = sql.split('\n');
        let statement = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line == '')
                continue;
            if (line.substr(0, 2) == '--')
                continue;
            statement += line.trim();
            if (line[line.length - 1] == ',')
                statement += ' ';
            if (line[line.length - 1] == ';') {
                output.push(statement);
                statement = '';
            }
        }
        return output;
    }
    logQuery(sql, params = null) {
        if (!this.sqlQueryLogEnabled_)
            return;
        if (this.logExcludedQueryTypes_.length) {
            const temp = sql.toLowerCase();
            for (let i = 0; i < this.logExcludedQueryTypes_.length; i++) {
                if (temp.indexOf(this.logExcludedQueryTypes_[i].toLowerCase()) === 0)
                    return;
            }
        }
        this.logger().debug(sql);
        if (params !== null && params.length)
            this.logger().debug(JSON.stringify(params));
    }
    static insertQuery(tableName, data) {
        if (!data || !Object.keys(data).length)
            throw new Error('Data is empty');
        let keySql = '';
        let valueSql = '';
        const params = [];
        for (const key in data) {
            if (!data.hasOwnProperty(key))
                continue;
            if (key[key.length - 1] == '_')
                continue;
            if (keySql != '')
                keySql += ', ';
            if (valueSql != '')
                valueSql += ', ';
            keySql += `\`${key}\``;
            valueSql += '?';
            params.push(data[key]);
        }
        return {
            sql: `INSERT INTO \`${tableName}\` (${keySql}) VALUES (${valueSql})`,
            params: params,
        };
    }
    static updateQuery(tableName, data, where) {
        if (!data || !Object.keys(data).length)
            throw new Error('Data is empty');
        let sql = '';
        const params = [];
        for (const key in data) {
            if (!data.hasOwnProperty(key))
                continue;
            if (key[key.length - 1] == '_')
                continue;
            if (sql != '')
                sql += ', ';
            sql += `\`${key}\`=?`;
            params.push(data[key]);
        }
        if (typeof where != 'string') {
            const s = [];
            for (const n in where) {
                if (!where.hasOwnProperty(n))
                    continue;
                params.push(where[n]);
                s.push(`\`${n}\`=?`);
            }
            where = s.join(' AND ');
        }
        return {
            sql: `UPDATE \`${tableName}\` SET ${sql} WHERE ${where}`,
            params: params,
        };
    }
    alterColumnQueries(tableName, fields) {
        const fieldsNoType = [];
        for (const n in fields) {
            if (!fields.hasOwnProperty(n))
                continue;
            fieldsNoType.push(n);
        }
        const fieldsWithType = [];
        for (const n in fields) {
            if (!fields.hasOwnProperty(n))
                continue;
            fieldsWithType.push(`${this.escapeField(n)} ${fields[n]}`);
        }
        let sql = `
			CREATE TEMPORARY TABLE _BACKUP_TABLE_NAME_(_FIELDS_TYPE_);
			INSERT INTO _BACKUP_TABLE_NAME_ SELECT _FIELDS_NO_TYPE_ FROM _TABLE_NAME_;
			DROP TABLE _TABLE_NAME_;
			CREATE TABLE _TABLE_NAME_(_FIELDS_TYPE_);
			INSERT INTO _TABLE_NAME_ SELECT _FIELDS_NO_TYPE_ FROM _BACKUP_TABLE_NAME_;
			DROP TABLE _BACKUP_TABLE_NAME_;
		`;
        sql = sql.replace(/_BACKUP_TABLE_NAME_/g, this.escapeField(`${tableName}_backup`));
        sql = sql.replace(/_TABLE_NAME_/g, this.escapeField(tableName));
        sql = sql.replace(/_FIELDS_NO_TYPE_/g, this.escapeFields(fieldsNoType).join(','));
        sql = sql.replace(/_FIELDS_TYPE_/g, fieldsWithType.join(','));
        return sql.trim().split('\n');
    }
    wrapQueries(queries) {
        const output = [];
        for (let i = 0; i < queries.length; i++) {
            output.push(this.wrapQuery(queries[i]));
        }
        return output;
    }
    wrapQuery(sql, params = null) {
        if (!sql)
            throw new Error(`Cannot wrap empty string: ${sql}`);
        if (Array.isArray(sql)) {
            return {
                sql: sql[0],
                params: sql.length >= 2 ? sql[1] : null,
            };
        }
        else if (typeof sql === 'string') {
            return { sql: sql, params: params };
        }
        else {
            return sql; // Already wrapped
        }
    }
}
exports.default = Database;
Database.TYPE_UNKNOWN = 0;
Database.TYPE_INT = 1;
Database.TYPE_TEXT = 2;
Database.TYPE_NUMERIC = 3;
//# sourceMappingURL=database.js.map