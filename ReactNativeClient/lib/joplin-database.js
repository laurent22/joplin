const { promiseChain } = require('lib/promise-utils.js');
const { Database } = require('lib/database.js');
const { sprintf } = require('sprintf-js');
const Resource = require('lib/models/Resource');
const { shim } = require('lib/shim.js');

const structureSql = `
CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL,
	updated_time INT NOT NULL
);

CREATE INDEX folders_title ON folders (title);
CREATE INDEX folders_updated_time ON folders (updated_time);

CREATE TABLE notes (
	id TEXT PRIMARY KEY,
	parent_id TEXT NOT NULL DEFAULT "",
	title TEXT NOT NULL DEFAULT "",
	body TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL,
	updated_time INT NOT NULL,
	is_conflict INT NOT NULL DEFAULT 0,
	latitude NUMERIC NOT NULL DEFAULT 0,
	longitude NUMERIC NOT NULL DEFAULT 0,
	altitude NUMERIC NOT NULL DEFAULT 0,
	author TEXT NOT NULL DEFAULT "",
	source_url TEXT NOT NULL DEFAULT "",
	is_todo INT NOT NULL DEFAULT 0,
	todo_due INT NOT NULL DEFAULT 0,
	todo_completed INT NOT NULL DEFAULT 0,
	source TEXT NOT NULL DEFAULT "",
	source_application TEXT NOT NULL DEFAULT "",
	application_data TEXT NOT NULL DEFAULT "",
	\`order\` INT NOT NULL DEFAULT 0
);

CREATE INDEX notes_title ON notes (title);
CREATE INDEX notes_updated_time ON notes (updated_time);
CREATE INDEX notes_is_conflict ON notes (is_conflict);
CREATE INDEX notes_is_todo ON notes (is_todo);
CREATE INDEX notes_order ON notes (\`order\`);

CREATE TABLE tags (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL,
	updated_time INT NOT NULL
);

CREATE INDEX tags_title ON tags (title);
CREATE INDEX tags_updated_time ON tags (updated_time);

CREATE TABLE note_tags (
	id TEXT PRIMARY KEY,
	note_id TEXT NOT NULL,
	tag_id TEXT NOT NULL,
	created_time INT NOT NULL,
	updated_time INT NOT NULL
);

CREATE INDEX note_tags_note_id ON note_tags (note_id);
CREATE INDEX note_tags_tag_id ON note_tags (tag_id);
CREATE INDEX note_tags_updated_time ON note_tags (updated_time);

CREATE TABLE resources (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL DEFAULT "",
	mime TEXT NOT NULL,
	filename TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL,
	updated_time INT NOT NULL
);

CREATE INDEX resources_title ON resources (title);
CREATE INDEX resources_updated_time ON resources (updated_time);

CREATE TABLE settings (
	\`key\` TEXT PRIMARY KEY,
	\`value\` TEXT,
	\`type\` INT NOT NULL
);

CREATE TABLE table_fields (
	id INTEGER PRIMARY KEY,
	table_name TEXT NOT NULL,
	field_name TEXT NOT NULL,
	field_type INT NOT NULL,
	field_default TEXT
);

CREATE TABLE sync_items (
	id INTEGER PRIMARY KEY,
	sync_target INT NOT NULL,
	sync_time INT NOT NULL DEFAULT 0,
	item_type INT NOT NULL,
	item_id TEXT NOT NULL
);

CREATE INDEX sync_items_sync_time ON sync_items (sync_time);
CREATE INDEX sync_items_sync_target ON sync_items (sync_target);
CREATE INDEX sync_items_item_type ON sync_items (item_type);
CREATE INDEX sync_items_item_id ON sync_items (item_id);

CREATE TABLE deleted_items (
	id INTEGER PRIMARY KEY,
	item_type INT NOT NULL,
	item_id TEXT NOT NULL,
	deleted_time INT NOT NULL
);

CREATE TABLE version (
	version INT NOT NULL
);

INSERT INTO version (version) VALUES (1);
`;

class JoplinDatabase extends Database {
	constructor(driver) {
		super(driver);
		this.initialized_ = false;
		this.tableFields_ = null;
		this.version_ = null;
	}

	initialized() {
		return this.initialized_;
	}

	async open(options) {
		await super.open(options);
		return this.initialize();
	}

	tableFieldNames(tableName) {
		let tf = this.tableFields(tableName);
		let output = [];
		for (let i = 0; i < tf.length; i++) {
			output.push(tf[i].name);
		}
		return output;
	}

	tableFields(tableName, options = null) {
		if (options === null) options = {};

		if (!this.tableFields_) throw new Error('Fields have not been loaded yet');
		if (!this.tableFields_[tableName]) throw new Error(`Unknown table: ${tableName}`);
		const output = this.tableFields_[tableName].slice();

		if (options.includeDescription) {
			for (let i = 0; i < output.length; i++) {
				output[i].description = this.fieldDescription(tableName, output[i].name);
			}
		}

		return output;
	}

	async clearForTesting() {
		const tableNames = [
			'notes',
			'folders',
			'resources',
			'tags',
			'note_tags',
			// 'master_keys',
			'item_changes',
			'note_resources',
			// 'settings',
			'deleted_items',
			'sync_items',
			'notes_normalized',
			'revisions',
			'resources_to_download',
			'key_values',
		];

		const queries = [];
		for (const n of tableNames) {
			queries.push(`DELETE FROM ${n}`);
			queries.push(`DELETE FROM sqlite_sequence WHERE name="${n}"`); // Reset autoincremented IDs
		}

		queries.push('DELETE FROM settings WHERE key="sync.1.context"');
		queries.push('DELETE FROM settings WHERE key="sync.2.context"');
		queries.push('DELETE FROM settings WHERE key="sync.3.context"');
		queries.push('DELETE FROM settings WHERE key="sync.4.context"');
		queries.push('DELETE FROM settings WHERE key="sync.5.context"');
		queries.push('DELETE FROM settings WHERE key="sync.6.context"');
		queries.push('DELETE FROM settings WHERE key="sync.7.context"');

		queries.push('DELETE FROM settings WHERE key="revisionService.lastProcessedChangeId"');
		queries.push('DELETE FROM settings WHERE key="resourceService.lastProcessedChangeId"');
		queries.push('DELETE FROM settings WHERE key="searchEngine.lastProcessedChangeId"');

		await this.transactionExecBatch(queries);
	}

	createDefaultRow() {
		const row = {};
		const fields = this.tableFields('resource_local_states');
		for (let i = 0; i < fields.length; i++) {
			const f = fields[i];
			row[f.name] = Database.formatValue(f.type, f.default);
		}
		return row;
	}

	fieldDescription(tableName, fieldName) {
		const sp = sprintf;

		if (!this.tableDescriptions_) {
			this.tableDescriptions_ = {
				notes: {
					parent_id: sp('ID of the notebook that contains this note. Change this ID to move the note to a different notebook.'),
					body: sp('The note body, in Markdown. May also contain HTML.'),
					is_conflict: sp('Tells whether the note is a conflict or not.'),
					is_todo: sp('Tells whether this note is a todo or not.'),
					todo_due: sp('When the todo is due. An alarm will be triggered on that date.'),
					todo_completed: sp('Tells whether todo is completed or not. This is a timestamp in milliseconds.'),
					source_url: sp('The full URL where the note comes from.'),
				},
				folders: {},
				resources: {},
				tags: {},
			};

			const baseItems = ['notes', 'folders', 'tags', 'resources'];

			for (let i = 0; i < baseItems.length; i++) {
				const n = baseItems[i];
				const singular = n.substr(0, n.length - 1);
				this.tableDescriptions_[n].title = sp('The %s title.', singular);
				this.tableDescriptions_[n].created_time = sp('When the %s was created.', singular);
				this.tableDescriptions_[n].updated_time = sp('When the %s was last updated.', singular);
				this.tableDescriptions_[n].user_created_time = sp('When the %s was created. It may differ from created_time as it can be manually set by the user.', singular);
				this.tableDescriptions_[n].user_updated_time = sp('When the %s was last updated. It may differ from updated_time as it can be manually set by the user.', singular);
			}
		}

		const d = this.tableDescriptions_[tableName];
		return d && d[fieldName] ? d[fieldName] : '';
	}

	refreshTableFields() {
		this.logger().info('Initializing tables...');
		let queries = [];
		queries.push(this.wrapQuery('DELETE FROM table_fields'));

		return this.selectAll('SELECT name FROM sqlite_master WHERE type="table"')
			.then(tableRows => {
				let chain = [];
				for (let i = 0; i < tableRows.length; i++) {
					let tableName = tableRows[i].name;
					if (tableName == 'android_metadata') continue;
					if (tableName == 'table_fields') continue;
					if (tableName == 'sqlite_sequence') continue;
					if (tableName.indexOf('notes_fts') === 0) continue;
					chain.push(() => {
						return this.selectAll(`PRAGMA table_info("${tableName}")`).then(pragmas => {
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
			})
			.then(() => {
				return this.transactionExecBatch(queries);
			});
	}

	addMigrationFile(num) {
		const timestamp = Date.now();
		return { sql: 'INSERT INTO migrations (number, created_time, updated_time) VALUES (?, ?, ?)', params: [num, timestamp, timestamp] };
	}

	async upgradeDatabase(fromVersion) {
		// INSTRUCTIONS TO UPGRADE THE DATABASE:
		//
		// 1. Add the new version number to the existingDatabaseVersions array
		// 2. Add the upgrade logic to the "switch (targetVersion)" statement below

		// IMPORTANT:
		//
		// Whenever adding a new database property, some additional logic might be needed
		// in the synchronizer to handle this property. For example, when adding a property
		// that should have a default value, existing remote items will not have this
		// default value and thus might cause problems. In that case, the default value
		// must be set in the synchronizer too.

		// Note: v16 and v17 don't do anything. They were used to debug an issue.
		const existingDatabaseVersions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];

		let currentVersionIndex = existingDatabaseVersions.indexOf(fromVersion);

		// currentVersionIndex < 0 if for the case where an old version of Joplin used with a newer
		// version of the database, so that migration is not run in this case.
		if (currentVersionIndex < 0) {
			throw new Error(
				'Unknown profile version. Most likely this is an old version of Joplin, while the profile was created by a newer version. Please upgrade Joplin at https://joplinapp.org and try again.\n'
				+ `Joplin version: ${shim.appVersion()}\n`
				+ `Profile version: ${fromVersion}\n`
				+ `Expected version: ${existingDatabaseVersions[existingDatabaseVersions.length-1]}`);
		}

		if (currentVersionIndex == existingDatabaseVersions.length - 1) return fromVersion;

		let latestVersion = fromVersion;

		while (currentVersionIndex < existingDatabaseVersions.length - 1) {
			const targetVersion = existingDatabaseVersions[currentVersionIndex + 1];
			this.logger().info(`Converting database to version ${targetVersion}`);

			let queries = [];

			if (targetVersion == 1) {
				queries = this.wrapQueries(this.sqlStringToLines(structureSql));
			}

			if (targetVersion == 2) {
				const newTableSql = `
					CREATE TABLE deleted_items (
						id INTEGER PRIMARY KEY,
						item_type INT NOT NULL,
						item_id TEXT NOT NULL,
						deleted_time INT NOT NULL,
						sync_target INT NOT NULL
					);
				`;

				queries.push({ sql: 'DROP TABLE deleted_items' });
				queries.push({ sql: this.sqlStringToLines(newTableSql)[0] });
				queries.push({ sql: 'CREATE INDEX deleted_items_sync_target ON deleted_items (sync_target)' });
			}

			if (targetVersion == 3) {
				queries = this.alterColumnQueries('settings', { key: 'TEXT PRIMARY KEY', value: 'TEXT' });
			}

			if (targetVersion == 4) {
				queries.push('INSERT INTO settings (`key`, `value`) VALUES (\'sync.3.context\', (SELECT `value` FROM settings WHERE `key` = \'sync.context\'))');
				queries.push('DELETE FROM settings WHERE `key` = "sync.context"');
			}

			if (targetVersion == 5) {
				const tableNames = ['notes', 'folders', 'tags', 'note_tags', 'resources'];
				for (let i = 0; i < tableNames.length; i++) {
					const n = tableNames[i];
					queries.push(`ALTER TABLE ${n} ADD COLUMN user_created_time INT NOT NULL DEFAULT 0`);
					queries.push(`ALTER TABLE ${n} ADD COLUMN user_updated_time INT NOT NULL DEFAULT 0`);
					queries.push(`UPDATE ${n} SET user_created_time = created_time`);
					queries.push(`UPDATE ${n} SET user_updated_time = updated_time`);
					queries.push(`CREATE INDEX ${n}_user_updated_time ON ${n} (user_updated_time)`);
				}
			}

			if (targetVersion == 6) {
				queries.push('CREATE TABLE alarms (id INTEGER PRIMARY KEY AUTOINCREMENT, note_id TEXT NOT NULL, trigger_time INT NOT NULL)');
				queries.push('CREATE INDEX alarm_note_id ON alarms (note_id)');
			}

			if (targetVersion == 7) {
				queries.push('ALTER TABLE resources ADD COLUMN file_extension TEXT NOT NULL DEFAULT ""');
			}

			if (targetVersion == 8) {
				queries.push('ALTER TABLE sync_items ADD COLUMN sync_disabled INT NOT NULL DEFAULT "0"');
				queries.push('ALTER TABLE sync_items ADD COLUMN sync_disabled_reason TEXT NOT NULL DEFAULT ""');
			}

			if (targetVersion == 9) {
				const newTableSql = `
					CREATE TABLE master_keys (
						id TEXT PRIMARY KEY,
						created_time INT NOT NULL,
						updated_time INT NOT NULL,
						source_application TEXT NOT NULL,
						encryption_method INT NOT NULL,
						checksum TEXT NOT NULL,
						content TEXT NOT NULL
					);
				`;
				queries.push(this.sqlStringToLines(newTableSql)[0]);
				const tableNames = ['notes', 'folders', 'tags', 'note_tags', 'resources'];
				for (let i = 0; i < tableNames.length; i++) {
					const n = tableNames[i];
					queries.push(`ALTER TABLE ${n} ADD COLUMN encryption_cipher_text TEXT NOT NULL DEFAULT ""`);
					queries.push(`ALTER TABLE ${n} ADD COLUMN encryption_applied INT NOT NULL DEFAULT 0`);
					queries.push(`CREATE INDEX ${n}_encryption_applied ON ${n} (encryption_applied)`);
				}

				queries.push('ALTER TABLE sync_items ADD COLUMN force_sync INT NOT NULL DEFAULT 0');
				queries.push('ALTER TABLE resources ADD COLUMN encryption_blob_encrypted INT NOT NULL DEFAULT 0');
			}

			const upgradeVersion10 = () => {
				const itemChangesTable = `
					CREATE TABLE item_changes (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						item_type INT NOT NULL,
						item_id TEXT NOT NULL,
						type INT NOT NULL,
						created_time INT NOT NULL
					);
				`;

				const noteResourcesTable = `
					CREATE TABLE note_resources (
						id INTEGER PRIMARY KEY,
						note_id TEXT NOT NULL,
						resource_id TEXT NOT NULL,
						is_associated INT NOT NULL,
						last_seen_time INT NOT NULL
					);
				`;

				queries.push(this.sqlStringToLines(itemChangesTable)[0]);
				queries.push('CREATE INDEX item_changes_item_id ON item_changes (item_id)');
				queries.push('CREATE INDEX item_changes_created_time ON item_changes (created_time)');
				queries.push('CREATE INDEX item_changes_item_type ON item_changes (item_type)');

				queries.push(this.sqlStringToLines(noteResourcesTable)[0]);
				queries.push('CREATE INDEX note_resources_note_id ON note_resources (note_id)');
				queries.push('CREATE INDEX note_resources_resource_id ON note_resources (resource_id)');

				queries.push({ sql: 'INSERT INTO item_changes (item_type, item_id, type, created_time) SELECT 1, id, 1, ? FROM notes', params: [Date.now()] });
			};

			if (targetVersion == 10) {
				upgradeVersion10();
			}

			if (targetVersion == 11) {
				// This trick was needed because Electron Builder incorrectly released a dev branch containing v10 as it was
				// still being developed, and the db schema was not final at that time. So this v11 was created to
				// make sure any invalid db schema that was accidentally created was deleted and recreated.
				queries.push('DROP TABLE item_changes');
				queries.push('DROP TABLE note_resources');
				upgradeVersion10();
			}

			if (targetVersion == 12) {
				queries.push('ALTER TABLE folders ADD COLUMN parent_id TEXT NOT NULL DEFAULT ""');
			}

			if (targetVersion == 13) {
				queries.push('ALTER TABLE resources ADD COLUMN fetch_status INT NOT NULL DEFAULT "2"');
				queries.push('ALTER TABLE resources ADD COLUMN fetch_error TEXT NOT NULL DEFAULT ""');
				queries.push({ sql: 'UPDATE resources SET fetch_status = ?', params: [Resource.FETCH_STATUS_DONE] });
			}

			if (targetVersion == 14) {
				const resourceLocalStates = `
					CREATE TABLE resource_local_states (
						id INTEGER PRIMARY KEY,
						resource_id TEXT NOT NULL,
						fetch_status INT NOT NULL DEFAULT "2",
						fetch_error TEXT NOT NULL DEFAULT ""
					);
				`;

				queries.push(this.sqlStringToLines(resourceLocalStates)[0]);

				queries.push('INSERT INTO resource_local_states SELECT null, id, fetch_status, fetch_error FROM resources');

				queries.push('CREATE INDEX resource_local_states_resource_id ON resource_local_states (resource_id)');
				queries.push('CREATE INDEX resource_local_states_resource_fetch_status ON resource_local_states (fetch_status)');

				queries = queries.concat(
					this.alterColumnQueries('resources', {
						id: 'TEXT PRIMARY KEY',
						title: 'TEXT NOT NULL DEFAULT ""',
						mime: 'TEXT NOT NULL',
						filename: 'TEXT NOT NULL DEFAULT ""',
						created_time: 'INT NOT NULL',
						updated_time: 'INT NOT NULL',
						user_created_time: 'INT NOT NULL DEFAULT 0',
						user_updated_time: 'INT NOT NULL DEFAULT 0',
						file_extension: 'TEXT NOT NULL DEFAULT ""',
						encryption_cipher_text: 'TEXT NOT NULL DEFAULT ""',
						encryption_applied: 'INT NOT NULL DEFAULT 0',
						encryption_blob_encrypted: 'INT NOT NULL DEFAULT 0',
					})
				);
			}

			if (targetVersion == 15) {
				queries.push('CREATE VIRTUAL TABLE notes_fts USING fts4(content="notes", notindexed="id", id, title, body)');
				queries.push('INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes WHERE is_conflict = 0 AND encryption_applied = 0');

				// Keep the content tables (notes) and the FTS table (notes_fts) in sync.
				// More info at https://www.sqlite.org/fts3.html#_external_content_fts4_tables_
				queries.push(`
					CREATE TRIGGER notes_fts_before_update BEFORE UPDATE ON notes BEGIN
						DELETE FROM notes_fts WHERE docid=old.rowid;
					END;`);
				queries.push(`
					CREATE TRIGGER notes_fts_before_delete BEFORE DELETE ON notes BEGIN
						DELETE FROM notes_fts WHERE docid=old.rowid;
					END;`);
				queries.push(`
					CREATE TRIGGER notes_after_update AFTER UPDATE ON notes BEGIN
						INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes WHERE is_conflict = 0 AND encryption_applied = 0 AND new.rowid = notes.rowid;
					END;`);
				queries.push(`
					CREATE TRIGGER notes_after_insert AFTER INSERT ON notes BEGIN
						INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes WHERE is_conflict = 0 AND encryption_applied = 0 AND new.rowid = notes.rowid;
					END;`);
			}

			if (targetVersion == 18) {
				const notesNormalized = `
					CREATE TABLE notes_normalized (
						id TEXT NOT NULL,
						title TEXT NOT NULL DEFAULT "",
						body TEXT NOT NULL DEFAULT "" 
					);
				`;

				queries.push(this.sqlStringToLines(notesNormalized)[0]);

				queries.push('CREATE INDEX notes_normalized_id ON notes_normalized (id)');

				queries.push('DROP TRIGGER IF EXISTS notes_fts_before_update');
				queries.push('DROP TRIGGER IF EXISTS notes_fts_before_delete');
				queries.push('DROP TRIGGER IF EXISTS notes_after_update');
				queries.push('DROP TRIGGER IF EXISTS notes_after_insert');
				queries.push('DROP TABLE IF EXISTS notes_fts');

				queries.push('CREATE VIRTUAL TABLE notes_fts USING fts4(content="notes_normalized", notindexed="id", id, title, body)');

				// Keep the content tables (notes) and the FTS table (notes_fts) in sync.
				// More info at https://www.sqlite.org/fts3.html#_external_content_fts4_tables_
				queries.push(`
					CREATE TRIGGER notes_fts_before_update BEFORE UPDATE ON notes_normalized BEGIN
						DELETE FROM notes_fts WHERE docid=old.rowid;
					END;`);
				queries.push(`
					CREATE TRIGGER notes_fts_before_delete BEFORE DELETE ON notes_normalized BEGIN
						DELETE FROM notes_fts WHERE docid=old.rowid;
					END;`);
				queries.push(`
					CREATE TRIGGER notes_after_update AFTER UPDATE ON notes_normalized BEGIN
						INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes_normalized WHERE new.rowid = notes_normalized.rowid;
					END;`);
				queries.push(`
					CREATE TRIGGER notes_after_insert AFTER INSERT ON notes_normalized BEGIN
						INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes_normalized WHERE new.rowid = notes_normalized.rowid;
					END;`);
			}

			if (targetVersion == 19) {
				const newTableSql = `
					CREATE TABLE revisions (
						id TEXT PRIMARY KEY,
						parent_id TEXT NOT NULL DEFAULT "",
						item_type INT NOT NULL,
						item_id TEXT NOT NULL,
						item_updated_time INT NOT NULL,
						title_diff TEXT NOT NULL DEFAULT "",
						body_diff TEXT NOT NULL DEFAULT "",
						metadata_diff TEXT NOT NULL DEFAULT "",
						encryption_cipher_text TEXT NOT NULL DEFAULT "",
						encryption_applied INT NOT NULL DEFAULT 0,
						updated_time INT NOT NULL,
						created_time INT NOT NULL
					);
				`;
				queries.push(this.sqlStringToLines(newTableSql)[0]);

				queries.push('CREATE INDEX revisions_parent_id ON revisions (parent_id)');
				queries.push('CREATE INDEX revisions_item_type ON revisions (item_type)');
				queries.push('CREATE INDEX revisions_item_id ON revisions (item_id)');
				queries.push('CREATE INDEX revisions_item_updated_time ON revisions (item_updated_time)');
				queries.push('CREATE INDEX revisions_updated_time ON revisions (updated_time)');

				queries.push('ALTER TABLE item_changes ADD COLUMN source INT NOT NULL DEFAULT 1');
				queries.push('ALTER TABLE item_changes ADD COLUMN before_change_item TEXT NOT NULL DEFAULT ""');
			}

			if (targetVersion == 20) {
				const newTableSql = `
					CREATE TABLE migrations (
						id INTEGER PRIMARY KEY,
						number INTEGER NOT NULL,
						updated_time INT NOT NULL,
						created_time INT NOT NULL
					);
				`;
				queries.push(this.sqlStringToLines(newTableSql)[0]);

				queries.push('ALTER TABLE resources ADD COLUMN `size` INT NOT NULL DEFAULT -1');
				queries.push(this.addMigrationFile(20));
			}

			if (targetVersion == 21) {
				queries.push('ALTER TABLE sync_items ADD COLUMN item_location INT NOT NULL DEFAULT 1');
			}

			if (targetVersion == 22) {
				const newTableSql = `
					CREATE TABLE resources_to_download (
						id INTEGER PRIMARY KEY,
						resource_id TEXT NOT NULL,
						updated_time INT NOT NULL,
						created_time INT NOT NULL
					);
				`;
				queries.push(this.sqlStringToLines(newTableSql)[0]);

				queries.push('CREATE INDEX resources_to_download_resource_id ON resources_to_download (resource_id)');
				queries.push('CREATE INDEX resources_to_download_updated_time ON resources_to_download (updated_time)');
			}

			if (targetVersion == 23) {
				const newTableSql = `
					CREATE TABLE key_values (
						id INTEGER PRIMARY KEY,
						\`key\` TEXT NOT NULL,
						\`value\` TEXT NOT NULL,
						\`type\` INT NOT NULL,
						updated_time INT NOT NULL
					);
				`;
				queries.push(this.sqlStringToLines(newTableSql)[0]);

				queries.push('CREATE UNIQUE INDEX key_values_key ON key_values (key)');
			}

			if (targetVersion == 24) {
				queries.push('ALTER TABLE notes ADD COLUMN `markup_language` INT NOT NULL DEFAULT 1'); // 1: Markdown, 2: HTML
			}

			if (targetVersion == 25) {
				queries.push(`CREATE VIEW tags_with_note_count AS 
						SELECT tags.id as id, tags.title as title, tags.created_time as created_time, tags.updated_time as updated_time, COUNT(notes.id) as note_count 
						FROM tags 
							LEFT JOIN note_tags nt on nt.tag_id = tags.id 
							LEFT JOIN notes on notes.id = nt.note_id 
						WHERE notes.id IS NOT NULL 
						GROUP BY tags.id`);
			}

			if (targetVersion == 26) {
				const tableNames = ['notes', 'folders', 'tags', 'note_tags', 'resources'];
				for (let i = 0; i < tableNames.length; i++) {
					const n = tableNames[i];
					queries.push(`ALTER TABLE ${n} ADD COLUMN is_shared INT NOT NULL DEFAULT 0`);
				}
			}

			if (targetVersion == 27) {
				queries.push(this.addMigrationFile(27));
			}

			if (targetVersion == 28) {
				queries.push('CREATE INDEX resources_size ON resources(size)');
			}

			queries.push({ sql: 'UPDATE version SET version = ?', params: [targetVersion] });

			try {
				await this.transactionExecBatch(queries);
			} catch (error) {
				if (targetVersion === 15 || targetVersion === 18) {
					this.logger().warn('Could not upgrade to database v15 or v18 - FTS feature will not be used', error);
				} else {
					throw error;
				}
			}

			latestVersion = targetVersion;

			currentVersionIndex++;
		}

		return latestVersion;
	}

	async ftsEnabled() {
		try {
			await this.selectOne('SELECT count(*) FROM notes_fts');
		} catch (error) {
			this.logger().warn('FTS check failed', error);
			return false;
		}

		this.logger().info('FTS check succeeded');

		return true;
	}

	version() {
		return this.version_;
	}

	async initialize() {
		this.logger().info('Checking for database schema update...');

		let versionRow = null;
		try {
			// Will throw if the database has not been created yet, but this is handled below
			versionRow = await this.selectOne('SELECT * FROM version LIMIT 1');
		} catch (error) {
			if (error.message && error.message.indexOf('no such table: version') >= 0) {
				// Ignore
			} else {
				console.info(error);
			}
		}

		const version = !versionRow ? 0 : versionRow.version;
		this.version_ = version;
		this.logger().info('Current database version', version);

		const newVersion = await this.upgradeDatabase(version);
		this.version_ = newVersion;
		if (newVersion !== version) await this.refreshTableFields();

		this.tableFields_ = {};

		let rows = await this.selectAll('SELECT * FROM table_fields');

		for (let i = 0; i < rows.length; i++) {
			let row = rows[i];
			if (!this.tableFields_[row.table_name]) this.tableFields_[row.table_name] = [];
			this.tableFields_[row.table_name].push({
				name: row.field_name,
				type: row.field_type,
				default: Database.formatValue(row.field_type, row.field_default),
			});
		}
	}
}

Database.TYPE_INT = 1;
Database.TYPE_TEXT = 2;
Database.TYPE_NUMERIC = 3;

module.exports = { JoplinDatabase };
