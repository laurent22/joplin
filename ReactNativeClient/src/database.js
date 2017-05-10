import SQLite from 'react-native-sqlite-storage';
import { Log } from 'src/log.js';

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

INSERT INTO version (version) VALUES (1);
`;

class Database {

	constructor() {}

	setDebugEnabled(v) {
		SQLite.DEBUG(v);
	}

	open() {
		this.db_ = SQLite.openDatabase({ name: 'joplin.sqlite', location: 'Documents' }, (db) => {
			Log.info('Database was open successfully');
		}, (error) => {
			Log.error('Cannot open database: ', error);
		});

		this.updateSchema();
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

	selectOne(sql, params = null) {
		return new Promise((resolve, reject) => {
			this.db_.executeSql(sql, params, (r) => {
				resolve(r.rows.length ? r.rows.item(0) : null);
			}, (error) => {
				reject(error);
			});
		});
	}

	static insertSql(tableName, data) {
		let output = '';
		let keySql= '';
		let valueSql = '';
		for (let key in data) {
			if (data.hasOwnProperty(key)) continue;
			if (keySql != '') keySql += ', ';
			if (valueSql != '') valueSql += ', ';
			keySql += key;
			valueSql += '?';
		}
		return 'INSERT INTO ' + tableName + ' (' + keySql + ') VALUES (' + valueSql + ')';
	}

	updateSchema() {
		Log.info('Checking for database schema update...');

		this.selectOne('SELECT * FROM version LIMIT 1').then((row) => {
			// TODO: version update logic
		}).catch((error) => {
			// Assume that error was:
			// { message: 'no such table: version (code 1): , while compiling: SELECT * FROM version', code: 0 }
			// which means the database is empty and the tables need to be created.

			Log.info('Database is new - creating the schema...');

			let statements = this.sqlStringToLines(structureSql)
			this.db_.transaction((tx) => {
				for (let i = 0; i < statements.length; i++) {
					tx.executeSql(statements[i]);
				}
			}, (error) => {
				Log.error('Could not create database schema:', error);
			}, () => {
				Log.info('Database schema created successfully');
			});
		});
	}

}

export { Database };