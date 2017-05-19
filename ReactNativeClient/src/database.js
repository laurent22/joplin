import SQLite from 'react-native-sqlite-storage';
import { Log } from 'src/log.js';
import { uuid } from 'src/uuid.js';
import { promiseChain } from 'src/promise-chain.js';

const structureSql = `
CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	parent_id TEXT NOT NULL DEFAULT "",
	title TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL DEFAULT 0,
	updated_time INT NOT NULL DEFAULT 0
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
	todo_due INT NOT NULL DEFAULT "",
	todo_completed INT NOT NULL DEFAULT "",
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
	field_name TEXT
);

INSERT INTO version (version) VALUES (1);
`;

class Database {

	constructor() {
		this.debugMode_ = false;
		this.initialized_ = false;
		this.tableFields_ = null;
	}

	setDebugEnabled(v) {
		SQLite.DEBUG(v);
		this.debugMode_ = v;
	}

	debugMode() {
		return this.debugMode_;
	}

	initialized() {
		return this.initialized_;
	}

	open() {
		this.db_ = SQLite.openDatabase({ name: '/storage/emulated/0/Download/joplin-15.sqlite' }, (db) => {
			Log.info('Database was open successfully');
		}, (error) => {
			Log.error('Cannot open database: ', error);
		});

		return this.initialize();
	}

	static enumToId(type, s) {
		if (type == 'settings') {
			if (s == 'int') return 1;
			if (s == 'string') return 2;
		}
		throw new Error('Unknown enum type or value: ' + type + ', ' + s);
	}

	tableFieldNames(tableName) {
		if (!this.tableFields_) throw new Error('Fields have not been loaded yet');
		if (!this.tableFields_[tableName]) throw new Error('Unknown table: ' + tableName);
		return this.tableFields_[tableName];
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
		//Log.debug('DB: ' + sql, params);
	}

	selectOne(sql, params = null) {
		this.logQuery(sql, params);

		return new Promise((resolve, reject) => {
			this.db_.executeSql(sql, params, (r) => {
				resolve(r.rows.length ? r.rows.item(0) : null);
			}, (error) => {
				reject(error);
			});
		});
	}

	selectAll(sql, params = null) {
		this.logQuery(sql, params);

		return this.exec(sql, params);
	}

	exec(sql, params = null) {
		this.logQuery(sql, params);

		return new Promise((resolve, reject) => {
			this.db_.executeSql(sql, params, (r) => {
				resolve(r);
			}, (error) => {
				reject(error);
			});
		});
	}

	executeSql(sql, params = null) {
		return this.exec(sql, params);
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
			sql += key + '=?';
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
		return new Promise((resolve, reject) => {
			this.db_.transaction(
				readyCallack,
				(error) => { reject(error); },
				() => { resolve(); }
			);
		});
	}

	refreshTableFields() {
		return this.exec('SELECT name FROM sqlite_master WHERE type="table"').then((tableResults) => {
			let chain = [];
			for (let i = 0; i < tableResults.rows.length; i++) {
				let row = tableResults.rows.item(i);
				let tableName = row.name;
				if (tableName == 'android_metadata') continue;
				if (tableName == 'table_fields') continue;

				chain.push((queries) => {
					if (!queries) queries = [];
					return this.exec('PRAGMA table_info("' + tableName + '")').then((pragmaResult) => {
						for (let i = 0; i < pragmaResult.rows.length; i++) {
							let q = Database.insertQuery('table_fields', {
								table_name: tableName,
								field_name: pragmaResult.rows.item(i).name,
							});
							queries.push(q);
						}
						return queries;
					});
				});
			}

			return promiseChain(chain);
		}).then((queries) => {
			return this.transaction((tx) => {
				tx.executeSql('DELETE FROM table_fields');
				for (let i = 0; i < queries.length; i++) {
					tx.executeSql(queries[i].sql, queries[i].params);
				}
			});
		});
	}

	initialize() {
		Log.info('Checking for database schema update...');

		return this.selectOne('SELECT * FROM version LIMIT 1').then((row) => {
			Log.info('Current database version', row);
			// TODO: version update logic

			// TODO: only do this if db has been updated:
			return this.refreshTableFields();
		}).then(() => {
			return this.exec('SELECT * FROM table_fields').then((r) => {
				this.tableFields_ = {};
				for (let i = 0; i < r.rows.length; i++) {
					let row = r.rows.item(i);
					if (!this.tableFields_[row.table_name]) this.tableFields_[row.table_name] = [];
					this.tableFields_[row.table_name].push(row.field_name);
				}
			});
		}).catch((error) => {
			// Assume that error was:
			// { message: 'no such table: version (code 1): , while compiling: SELECT * FROM version', code: 0 }
			// which means the database is empty and the tables need to be created.
			// If it's any other error there's nothing we can do anyway.

			Log.info('Database is new - creating the schema...');

			let statements = this.sqlStringToLines(structureSql)
			return this.transaction((tx) => {
				for (let i = 0; i < statements.length; i++) {
					tx.executeSql(statements[i]);
				}
				tx.executeSql('INSERT INTO settings (`key`, `value`, `type`) VALUES ("clientId", "' + uuid.create() + '", "' + Database.enumToId('settings', 'string') + '")');
			}).then(() => {
				Log.info('Database schema created successfully');
				// Calling initialize() now that the db has been created will make it go through
				// the normal db update process (applying any additional patch).
				return this.initialize();
			})
		});
	}

}

export { Database };