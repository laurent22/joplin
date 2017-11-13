const { uuid } = require('lib/uuid.js');
const { promiseChain } = require('lib/promise-utils.js');
const { Logger } = require('lib/logger.js');
const { time } = require('lib/time-utils.js');
const { sprintf } = require('sprintf-js');

class Database {

	constructor(driver) {
		this.debugMode_ = false;
		this.driver_ = driver;
		this.inTransaction_ = false;

		this.logger_ = new Logger();
		this.logExcludedQueryTypes_ = [];
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

	async open(options) {
		await this.driver().open(options);
		this.logger().info('Database was open successfully');
	}

	escapeField(field) {
		if (field == '*') return '*';
		let p = field.split('.');
		if (p.length == 1) return '`' + field + '`';
		if (p.length == 2) return p[0] + '.`' + p[1] + '`';
		
		throw new Error('Invalid field format: ' + field);
	}

	escapeFields(fields) {
		if (fields == '*') return '*';

		let output = [];
		for (let i = 0; i < fields.length; i++) {
			output.push(this.escapeField(fields[i]));
		}
		return output;
	}

	async tryCall(callName, sql, params) {
		if (typeof sql === 'object') {
			params = sql.params;
			sql = sql.sql;
		}

		let waitTime = 50;
		let totalWaitTime = 0;
		while (true) {
			try {
				this.logQuery(sql, params);
				let result = await this.driver()[callName](sql, params);
				return result; // No exception was thrown
			} catch (error) {
				if (error && (error.code == 'SQLITE_IOERR' || error.code == 'SQLITE_BUSY')) {
					if (totalWaitTime >= 20000) throw this.sqliteErrorToJsError(error, sql, params);
					this.logger().warn(sprintf('Error %s: will retry in %s milliseconds', error.code, waitTime));
					this.logger().warn('Error was: ' + error.toString());
					await time.msleep(waitTime);
					totalWaitTime += waitTime;
					waitTime *= 1.5;
				} else {
					throw this.sqliteErrorToJsError(error, sql, params);
				}
			}
		}
	}

	async selectOne(sql, params = null) {
		return this.tryCall('selectOne', sql, params);
	}

	async selectAll(sql, params = null) {
		return this.tryCall('selectAll', sql, params);
	}

	async exec(sql, params = null) {
		return this.tryCall('exec', sql, params);
	}

	transactionExecBatch(queries) {
		if (queries.length <= 0) return Promise.resolve();

		if (queries.length == 1) {
			let q = this.wrapQuery(queries[0]);
			return this.exec(q.sql, q.params);
		}

		// There can be only one transaction running at a time so queue
		// any new transaction here.
		if (this.inTransaction_) {
			return new Promise((resolve, reject) => {
				let iid = setInterval(() => {
					if (!this.inTransaction_) {
						clearInterval(iid);
						this.transactionExecBatch(queries).then(() => {
							resolve();
						}).catch((error) => {
							reject(error);
						});
					}
				}, 100);
			});
		}

		this.inTransaction_ = true;

		queries.splice(0, 0, 'BEGIN TRANSACTION');
		queries.push('COMMIT'); // Note: ROLLBACK is currently not supported

		let chain = [];
		for (let i = 0; i < queries.length; i++) {
			let query = this.wrapQuery(queries[i]);
			chain.push(() => {
				return this.exec(query.sql, query.params);
			});
		}

		return promiseChain(chain).then(() => {
			this.inTransaction_ = false;
		});
	}

	static enumId(type, s) {
		if (type == 'settings') {
			if (s == 'int') return 1;
			if (s == 'string') return 2;
		}
		if (type == 'fieldType') {
			if (s == 'INTEGER') s = 'INT';
			if (!(('TYPE_' + s) in this)) throw new Error('Unkonwn fieldType: ' + s);
			return this['TYPE_' + s];
		}
		if (type == 'syncTarget') {
			if (s == 'memory') return 1;
			if (s == 'filesystem') return 2;
			if (s == 'onedrive') return 3;
		}
		throw new Error('Unknown enum type or value: ' + type + ', ' + s);
	}

	static formatValue(type, value) {
		if (value === null || value === undefined) return null;
		if (type == this.TYPE_INT) return Number(value);
		if (type == this.TYPE_TEXT) return value;
		if (type == this.TYPE_NUMERIC) return Number(value);
		throw new Error('Unknown type: ' + type);
	}

	sqlStringToLines(sql) {
		let output = [];
		let lines = sql.split("\n");
		let statement = '';
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (line == '') continue;
			if (line.substr(0, 2) == "--") continue;
			statement += line.trim();
			if (line[line.length - 1] == ',') statement += ' ';
			if (line[line.length - 1] == ';') {
				output.push(statement);
				statement = '';
			}
		}
		return output;
	}

	logQuery(sql, params = null) {
		if (this.logExcludedQueryTypes_.length) {
			const temp = sql.toLowerCase();
			for (let i = 0; i < this.logExcludedQueryTypes_.length; i++) {
				if (temp.indexOf(this.logExcludedQueryTypes_[i].toLowerCase()) === 0) return;
			}
		}

		this.logger().debug(sql);
		if (params !== null && params.length) this.logger().debug(JSON.stringify(params));
	}

	static insertQuery(tableName, data) {
		if (!data || !Object.keys(data).length) throw new Error('Data is empty');

		let keySql= '';
		let valueSql = '';
		let params = [];
		for (let key in data) {
			if (!data.hasOwnProperty(key)) continue;
			if (key[key.length - 1] == '_') continue;
			if (keySql != '') keySql += ', ';
			if (valueSql != '') valueSql += ', ';
			keySql += '`' + key + '`';
			valueSql += '?';
			params.push(data[key]);
		}
		return {
			sql: 'INSERT INTO `' + tableName + '` (' + keySql + ') VALUES (' + valueSql + ')',
			params: params,
		};
	}

	static updateQuery(tableName, data, where) {
		if (!data || !Object.keys(data).length) throw new Error('Data is empty');

		let sql = '';
		let params = [];
		for (let key in data) {
			if (!data.hasOwnProperty(key)) continue;
			if (key[key.length - 1] == '_') continue;
			if (sql != '') sql += ', ';
			sql += '`' + key + '`=?';
			params.push(data[key]);
		}

		if (typeof where != 'string') {
			let s = [];
			for (let n in where) {
				if (!where.hasOwnProperty(n)) continue;
				params.push(where[n]);
				s.push('`' + n + '`=?');
			}
			where = s.join(' AND ');
		}

		return {
			sql: 'UPDATE `' + tableName + '` SET ' + sql + ' WHERE ' + where,
			params: params,
		};
	}

	alterColumnQueries(tableName, fields) {
		let fieldsNoType = [];
		for (let n in fields) {
			if (!fields.hasOwnProperty(n)) continue;
			fieldsNoType.push(n);
		}

		let fieldsWithType = [];
		for (let n in fields) {
			if (!fields.hasOwnProperty(n)) continue;
			fieldsWithType.push(this.escapeField(n) + ' ' + fields[n]);
		}		

		let sql = `
			CREATE TEMPORARY TABLE _BACKUP_TABLE_NAME_(_FIELDS_TYPE_);
			INSERT INTO _BACKUP_TABLE_NAME_ SELECT _FIELDS_NO_TYPE_ FROM _TABLE_NAME_;
			DROP TABLE _TABLE_NAME_;
			CREATE TABLE _TABLE_NAME_(_FIELDS_TYPE_);
			INSERT INTO _TABLE_NAME_ SELECT _FIELDS_NO_TYPE_ FROM _BACKUP_TABLE_NAME_;
			DROP TABLE _BACKUP_TABLE_NAME_;
		`;

		sql = sql.replace(/_BACKUP_TABLE_NAME_/g, this.escapeField(tableName + '_backup'));
		sql = sql.replace(/_TABLE_NAME_/g, this.escapeField(tableName));
		sql = sql.replace(/_FIELDS_NO_TYPE_/g, this.escapeFields(fieldsNoType).join(','));
		sql = sql.replace(/_FIELDS_TYPE_/g, fieldsWithType.join(','));

		return sql.trim().split("\n");
	}
	
	wrapQueries(queries) {
		let output = [];
		for (let i = 0; i < queries.length; i++) {
			output.push(this.wrapQuery(queries[i]));
		}
		return output;
	}

	wrapQuery(sql, params = null) {
		if (!sql) throw new Error('Cannot wrap empty string: ' + sql);

		if (sql.constructor === Array) {
			let output = {};
			output.sql = sql[0];
			output.params = sql.length >= 2 ? sql[1] : null;
			return output;
		} else if (typeof sql === 'string') {
			return { sql: sql, params: params };
		} else {
			return sql; // Already wrapped
		}
	}

}

Database.TYPE_INT = 1;
Database.TYPE_TEXT = 2;
Database.TYPE_NUMERIC = 3;

module.exports = { Database };