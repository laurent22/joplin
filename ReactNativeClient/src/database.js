import { Log } from 'src/log.js';
import { uuid } from 'src/uuid.js';
import { promiseChain } from 'src/promise-chain.js';
import { _ } from 'src/locale.js'

const structureSql = `
CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	parent_id TEXT NOT NULL DEFAULT "",
	title TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL DEFAULT 0,
	updated_time INT NOT NULL DEFAULT 0,
	is_default BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE notes (
	id TEXT PRIMARY KEY,
	parent_id TEXT NOT NULL DEFAULT "",
	title TEXT NOT NULL DEFAULT "",
	body TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL DEFAULT 0,
	updated_time INT NOT NULL DEFAULT 0,
	latitude NUMERIC NOT NULL DEFAULT 0,
	longitude NUMERIC NOT NULL DEFAULT 0,
	altitude NUMERIC NOT NULL DEFAULT 0,
	source TEXT NOT NULL DEFAULT "",
	author TEXT NOT NULL DEFAULT "",
	source_url TEXT NOT NULL DEFAULT "",
	is_todo BOOLEAN NOT NULL DEFAULT 0,
	todo_due INT NOT NULL DEFAULT 0,
	todo_completed BOOLEAN NOT NULL DEFAULT 0,
	source_application TEXT NOT NULL DEFAULT "",
	application_data TEXT NOT NULL DEFAULT "",
	\`order\` INT NOT NULL DEFAULT 0
);

CREATE TABLE tags (
	id TEXT PRIMARY KEY,
	title TEXT,
	created_time INT,
	updated_time INT
);

CREATE TABLE note_tags (
	id INTEGER PRIMARY KEY,
	note_id TEXT,
	tag_id TEXT
);

CREATE TABLE resources (
	id TEXT PRIMARY KEY,
	title TEXT,
	mime TEXT,
	filename TEXT,
	created_time INT,
	updated_time INT
);

CREATE TABLE note_resources (
	id INTEGER PRIMARY KEY,
	note_id TEXT,
	resource_id TEXT
);

CREATE TABLE version (
	version INT
);

CREATE TABLE changes (
	id INTEGER PRIMARY KEY,
	\`type\` INT,
	item_id TEXT,
	item_type INT,
	item_field TEXT
);

CREATE TABLE settings (
	\`key\` TEXT PRIMARY KEY,
	\`value\` TEXT,
	\`type\` INT
);

CREATE TABLE table_fields (
	id INTEGER PRIMARY KEY,
	table_name TEXT,
	field_name TEXT,
	field_type INT,
	field_default TEXT
);

INSERT INTO version (version) VALUES (1);
`;

class Database {

	constructor(driver) {
		this.debugMode_ = false;
		this.initialized_ = false;
		this.tableFields_ = null;
		this.driver_ = driver;
	}

	setDebugEnabled(v) {
		this.driver_.setDebugEnabled(v);
		this.debugMode_ = v;
	}

	debugMode() {
		return this.debugMode_;
	}

	initialized() {
		return this.initialized_;
	}

	driver() {
		return this.driver_;
	}

	open(options) {
		return this.driver().open(options).then((db) => {
			Log.info('Database was open successfully');
			return this.initialize();
		}).catch((error) => {
			Log.error('Cannot open database: ', error);
		});
	}

	selectOne(sql, params = null) {
		this.logQuery(sql, params);
		return this.driver().selectOne(sql, params);
	}

	selectAll(sql, params = null) {
		this.logQuery(sql, params);
		return this.driver().selectAll(sql, params);
	}

	exec(sql, params = null) {
		this.logQuery(sql, params);
		return this.driver().exec(sql, params);
	}

	transactionExecBatch(queries) {
		let chain = [];
		for (let i = 0; i < queries.length; i++) {
			let query = this.wrapQuery(queries[i]);
			chain.push(() => {
				return this.exec(query.sql, query.params);
			});
		}
		return promiseChain(chain);
	}

	static enumId(type, s) {
		if (type == 'settings') {
			if (s == 'int') return 1;
			if (s == 'string') return 2;
		}
		if (type == 'fieldType') {
			return this['TYPE_' + s];
		}
		throw new Error('Unknown enum type or value: ' + type + ', ' + s);
	}

	tableFieldNames(tableName) {
		let tf = this.tableFields(tableName);
		let output = [];
		for (let i = 0; i < tf.length; i++) {
			output.push(tf[i].name);
		}
		return output;
	}

	tableFields(tableName) {
		if (!this.tableFields_) throw new Error('Fields have not been loaded yet');
		if (!this.tableFields_[tableName]) throw new Error('Unknown table: ' + tableName);
		return this.tableFields_[tableName];
	}

	static formatValue(type, value) {
		if (value === null || value === undefined) return null;
		if (type == this.TYPE_INT) return Number(value);
		if (type == this.TYPE_TEXT) return value;
		if (type == this.TYPE_BOOLEAN) return !!Number(value);
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
			statement += line;
			if (line[line.length - 1] == ';') {
				output.push(statement);
				statement = '';
			}
		}
		return output;
	}

	logQuery(sql, params = null) {
		if (!this.debugMode()) return;
		Log.debug('DB: ' + sql, params);
	}

	static insertQuery(tableName, data) {
		let keySql= '';
		let valueSql = '';
		let params = [];
		for (let key in data) {
			if (!data.hasOwnProperty(key)) continue;
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
		let sql = '';
		let params = [];
		for (let key in data) {
			if (!data.hasOwnProperty(key)) continue;
			if (sql != '') sql += ', ';
			sql += '`' + key + '`=?';
			params.push(data[key]);
		}

		if (typeof where != 'string') {
			params.push(where.id);
			where = 'id=?';
		}

		return {
			sql: 'UPDATE `' + tableName + '` SET ' + sql + ' WHERE ' + where,
			params: params,
		};
	}

	transaction(readyCallack) {
		throw new Error('transaction() DEPRECATED');
		// return new Promise((resolve, reject) => {
		// 	this.db_.transaction(
		// 		readyCallack,
		// 		(error) => { reject(error); },
		// 		() => { resolve(); }
		// 	);
		// });
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

	refreshTableFields() {
		let queries = [];
		queries.push(this.wrapQuery('DELETE FROM table_fields'));

		return this.selectAll('SELECT name FROM sqlite_master WHERE type="table"').then((tableRows) => {
			let chain = [];
			for (let i = 0; i < tableRows.length; i++) {
				let tableName = tableRows[i].name;
				if (tableName == 'android_metadata') continue;
				if (tableName == 'table_fields') continue;
				chain.push(() => {
					return this.selectAll('PRAGMA table_info("' + tableName + '")').then((pragmas) => {
						for (let i = 0; i < pragmas.length; i++) {
							let item = pragmas[i];
							// In SQLite, if the default value is a string it has double quotes around it, so remove them here
							let defaultValue = item.dflt_value;
							if (typeof defaultValue == 'string' && defaultValue.length >= 2 && defaultValue[0] == '"' && defaultValue[defaultValue.length - 1] == '"') {
								defaultValue = defaultValue.substr(1, defaultValue.length - 2);
							}
							let q = Database.insertQuery('table_fields', {
								table_name: tableName,
								field_name: item.name,
								field_type: Database.enumId('fieldType', item.type),
								field_default: defaultValue,
							});
							queries.push(q);
						}
					});
				});
			}

			return promiseChain(chain);
		}).then(() => {
			return this.transactionExecBatch(queries);
		});
	}

	initialize() {
		Log.info('Checking for database schema update...');

		return this.selectOne('SELECT * FROM version LIMIT 1').then((row) => {
			Log.info('Current database version', row);
			// TODO: version update logic

			// TODO: only do this if db has been updated:
			// return this.refreshTableFields();
		}).then(() => {
			this.tableFields_ = {};

			return this.selectAll('SELECT * FROM table_fields').then((rows) => {
				for (let i = 0; i < rows.length; i++) {
					let row = rows[i];
					if (!this.tableFields_[row.table_name]) this.tableFields_[row.table_name] = [];
					this.tableFields_[row.table_name].push({
						name: row.field_name,
						type: row.field_type,
						default: Database.formatValue(row.field_type, row.field_default),
					});
				}
			});

			
		// }).then(() => {
		// 	let p = this.exec('DELETE FROM notes').then(() => {
		// 		return this.exec('DELETE FROM folders');
		// 	}).then(() => {
		// 		return this.exec('DELETE FROM changes');
		// 	}).then(() => {
		// 		return this.exec('DELETE FROM settings WHERE `key` = "sync.lastRevId"');
		// 	});

		// 	return p.then(() => {
		// 		return this.exec('UPDATE settings SET `value` = "' + uuid.create() + '" WHERE `key` = "clientId"');
		// 	}).then(() => {
		// 		return this.exec('DELETE FROM settings WHERE `key` != "clientId"');
		// 	});

		// 	return p;

		}).catch((error) => {
			//console.info(error.code);
			if (error && error.code != 0 && error.code != 'SQLITE_ERROR') {
				Log.error(error);
				return;
			}
	
			// Assume that error was:
			// { message: 'no such table: version (code 1): , while compiling: SELECT * FROM version', code: 0 }
			// which means the database is empty and the tables need to be created.
			// If it's any other error there's nothing we can do anyway.

			Log.info('Database is new - creating the schema...');

			let queries = this.wrapQueries(this.sqlStringToLines(structureSql));
			queries.push(this.wrapQuery('INSERT INTO settings (`key`, `value`, `type`) VALUES ("clientId", "' + uuid.create() + '", "' + Database.enumId('settings', 'string') + '")'));
			queries.push(this.wrapQuery('INSERT INTO folders (`id`, `title`, `is_default`, `created_time`) VALUES ("' + uuid.create() + '", "' + _('Default list') + '", 1, ' + Math.round((new Date()).getTime() / 1000) + ')'));

			return this.transactionExecBatch(queries).then(() => {
				Log.info('Database schema created successfully');
				// Calling initialize() now that the db has been created will make it go through
				// the normal db update process (applying any additional patch).
				return this.refreshTableFields();
			}).then(() => {
				return this.initialize();
			});
		});
	}

}

Database.TYPE_INT = 1;
Database.TYPE_TEXT = 2;
Database.TYPE_BOOLEAN = 3;
Database.TYPE_NUMERIC = 4;

export { Database };