"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const time_1 = require("./time");
const shim_1 = require("./shim");
const Mutex = require('async-mutex').Mutex;
class Database {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async open(options) {
        var _a;
        try {
            await this.driver().open(options);
        }
        catch (error) {
            throw new Error(`Cannot open database: ${(_a = error.message) !== null && _a !== void 0 ? _a : error}: ${JSON.stringify(options)}`);
        }
        this.logger().info('Database was open successfully');
    }
    async close() {
        var _a, _b;
        try {
            await ((_b = (_a = this.driver()).close) === null || _b === void 0 ? void 0 : _b.call(_a));
        }
        catch (error) {
            this.logger().warn('Failed to close database', error);
        }
    }
    escapeField(field) {
        if (field === '*')
            return '*';
        const p = field.split('.');
        if (p.length === 1)
            return `\`${field}\``;
        if (p.length === 2)
            return `${p[0]}.\`${p[1]}\``;
        throw new Error(`Invalid field format: ${field}`);
    }
    escapeFields(fields) {
        if (fields === '*')
            return '*';
        const output = [];
        for (let i = 0; i < fields.length; i++) {
            output.push(this.escapeField(fields[i]));
        }
        return output;
    }
    escapeValues(values) {
        return values.map(value => {
            // See https://www.sqlite.org/printf.html#percentq
            return `'${value.replace(/[']/g, '\'\'')}'`;
        });
    }
    escapeFieldsToString(fields) {
        if (typeof fields === 'string') {
            if (fields === '*')
                return '*';
            throw new Error(`Invalid field value (only "*" is supported): ${fields}`);
        }
        const output = [];
        for (let i = 0; i < fields.length; i++) {
            output.push(this.escapeField(fields[i]));
        }
        return output.join(',');
    }
    async tryCall(callName, inputSql, inputParams) {
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
                    // eslint-disable-next-line no-console
                    console.info(`SQL START ${queryId}`, sql, params);
                    profilingTimeoutId = shim_1.default.setInterval(() => {
                        console.warn(`SQL ${queryId} has been running for ${Date.now() - callStartTime}: ${sql}`);
                    }, 3000);
                }
                const result = await this.driver()[callName](sql, params);
                if (this.profilingEnabled_) {
                    shim_1.default.clearInterval(profilingTimeoutId);
                    profilingTimeoutId = null;
                    const elapsed = Date.now() - callStartTime;
                    // eslint-disable-next-line no-console
                    if (elapsed > 10)
                        console.info(`SQL END ${queryId}`, elapsed, sql, params);
                }
                return result; // No exception was thrown
            }
            catch (error) {
                if (error && (error.code === 'SQLITE_IOERR' || error.code === 'SQLITE_BUSY')) {
                    if (totalWaitTime >= 20000)
                        throw this.sqliteErrorToJsError(error, sql, params);
                    // NOTE: don't put logger statements here because it might log to the database, which
                    // could result in an error being thrown again.
                    // this.logger().warn(sprintf('Error %s: will retry in %s milliseconds', error.code, waitTime));
                    // this.logger().warn('Error was: ' + error.toString());
                    await time_1.default.msleep(waitTime);
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
    }
    async selectOne(sql, params = null) {
        return this.tryCall('selectOne', sql, params);
    }
    async loadExtension( /* path */) {
        return; // Disabled for now as fuzzy search extension is not in use
        // let result =  null;
        // try {
        // 	result = await this.driver().loadExtension(path);
        // 	return result;
        // } catch (e) {
        // 	throw new Error(`Could not load extension ${path}`);
        // }
    }
    async selectAll(sql, params = null) {
        return this.tryCall('selectAll', sql, params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async selectAllFields(sql, params, field) {
        const rows = await this.tryCall('selectAll', sql, params);
        const output = [];
        for (let i = 0; i < rows.length; i++) {
            const v = rows[i][field];
            if (!v)
                throw new Error(`No such field: ${field}. Query was: ${sql}`);
            output.push(rows[i][field]);
        }
        return output;
    }
    async exec(sql, params = null) {
        return this.tryCall('exec', sql, params);
    }
    async transactionExecBatch(queries) {
        if (queries.length <= 0)
            return;
        if (queries.length === 1) {
            const q = this.wrapQuery(queries[0]);
            await this.exec(q.sql, q.params);
            return;
        }
        // There can be only one transaction running at a time so use a	mutex
        const release = await this.batchTransactionMutex_.acquire();
        try {
            await this.exec('BEGIN TRANSACTION');
            for (let i = 0; i < queries.length; i++) {
                const query = this.wrapQuery(queries[i]);
                await this.exec(query.sql, query.params);
            }
            await this.exec('COMMIT');
        }
        catch (error) {
            await this.exec('ROLLBACK');
            throw error;
        }
        finally {
            release();
        }
    }
    static enumId(type, s) {
        if (type === 'settings') {
            if (s === 'int')
                return 1;
            if (s === 'string')
                return 2;
        }
        if (type === 'fieldType') {
            if (s)
                s = s.toUpperCase();
            if (s === 'INTEGER')
                s = 'INT';
            if (!(`TYPE_${s}` in this))
                throw new Error(`Unknown fieldType: ${s}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            return this[`TYPE_${s}`];
        }
        if (type === 'syncTarget') {
            if (s === 'memory')
                return 1;
            if (s === 'filesystem')
                return 2;
            if (s === 'onedrive')
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static formatValue(type, value) {
        if (value === null || value === undefined)
            return null;
        if (type === this.TYPE_INT)
            return Number(value);
        if (type === this.TYPE_TEXT)
            return value;
        if (type === this.TYPE_NUMERIC)
            return Number(value);
        throw new Error(`Unknown type: ${type}`);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static insertQuery(tableName, data) {
        if (!data || !Object.keys(data).length)
            throw new Error('Data is empty');
        let keySql = '';
        let valueSql = '';
        const params = [];
        for (const key in data) {
            if (!data.hasOwnProperty(key))
                continue;
            if (key[key.length - 1] === '_')
                continue;
            if (keySql !== '')
                keySql += ', ';
            if (valueSql !== '')
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static updateQuery(tableName, data, where) {
        if (!data || !Object.keys(data).length)
            throw new Error('Data is empty');
        let sql = '';
        const params = [];
        for (const key in data) {
            if (!data.hasOwnProperty(key))
                continue;
            if (key[key.length - 1] === '_')
                continue;
            if (sql !== '')
                sql += ', ';
            sql += `\`${key}\`=?`;
            params.push(data[key]);
        }
        if (typeof where !== 'string') {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    wrapQueries(queries) {
        const output = [];
        for (let i = 0; i < queries.length; i++) {
            output.push(this.wrapQuery(queries[i]));
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
Database.TYPE_UNKNOWN = 0;
Database.TYPE_INT = 1;
Database.TYPE_TEXT = 2;
Database.TYPE_NUMERIC = 3;
exports.default = Database;
