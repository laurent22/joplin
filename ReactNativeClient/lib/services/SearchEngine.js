const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim.js');
const ItemChange = require('lib/models/ItemChange.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');

class SearchEngine {

	constructor() {
		this.dispatch = (action) => {};
		this.logger_ = new Logger();
		this.db_ = null;
	}

	// Note: Duplicated in JoplinDatabase migration 15
	async createFtsTables() {
		await this.db().exec('CREATE VIRTUAL TABLE notes_fts USING fts4(content="notes", notindexed="id", id, title, body)');
		await this.db().exec('INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes WHERE is_conflict = 0 AND encryption_applied = 0');
	}

	async dropFtsTables() {
		await this.db().exec('DROP TABLE IF EXISTS notes_fts');
	}

	async updateFtsTables() {

		// await this.db().exec('DELETE FROM notes_fts');
		// await this.db().exec('INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes WHERE is_conflict = 0 AND encryption_applied = 0');
		// return;

		this.logger().info('SearchEngine: Updating FTS table...');

		await ItemChange.waitForAllSaved();

		const startTime = Date.now();

		let lastChangeId = Setting.value('searchEngine.lastProcessedChangeId');

		while (true) {
			const changes = await ItemChange.modelSelectAll(`
				SELECT id, item_id, type
				FROM item_changes
				WHERE item_type = ?
				AND id > ?
				ORDER BY id ASC
				LIMIT 100
			`, [BaseModel.TYPE_NOTE, lastChangeId]);

			if (!changes.length) break;

			const queries = [];

			for (let i = 0; i < changes.length; i++) {
				const change = changes[i];

				if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
					queries.push({ sql: 'DELETE FROM notes_fts WHERE id = ?', params: [change.item_id] });
					queries.push({ sql: 'INSERT INTO notes_fts(docid, id, title, body) SELECT rowid, id, title, body FROM notes WHERE id = ?', params: [change.item_id] });
				} else if (change.type === ItemChange.TYPE_DELETE) {
					queries.push({ sql: 'DELETE FROM notes_fts WHERE id = ?', params: [change.item_id] });
				} else {
					throw new Error('Invalid change type: ' + change.type);
				}

				lastChangeId = change.id;
			}

			await this.db().transactionExecBatch(queries);
			Setting.setValue('searchEngine.lastProcessedChangeId', lastChangeId);
			await Setting.saveAll();
		}

		this.logger().info('SearchEngine: Updated FTS table in ' + (Date.now() - startTime) + 'ms');
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new SearchEngine();
		return this.instance_;
	}

	setLogger(logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	setDb(db) {
		this.db_ = db;
	}

	db() {
		return this.db_;
	}

	async countRows() {
		const sql = 'SELECT count(*) as total FROM notes_fts'
		const row = await this.db().selectOne(sql);
		return row && row['total'] ? row['total'] : 0;
	}

	columnIndexesFromOffsets_(offsets) {
		const occurenceCount = Math.floor(offsets.length / 4);
		const indexes = [];

		for (let i = 0; i < occurenceCount; i++) {
			const colIndex = offsets[i * 4] - 1;
			if (indexes.indexOf(colIndex) < 0) indexes.push(colIndex);
		}

		return indexes;
	}

	calculateWeight_(offsets) {
		// Offset doc: https://www.sqlite.org/fts3.html#offsets

		// TODO: If there's only one term - specia case - whatever has the most occurences win.
		// TODO: Parse query string.
		// TODO: Support wildcards
		
		const occurenceCount = Math.floor(offsets.length / 4);

		let spread = 0;
		let previousDist = null;
		for (let i = 0; i < occurenceCount; i++) {
			const dist = offsets[i * 4 + 2];

			if (previousDist !== null) {
				const delta = dist - previousDist;
				spread += delta;
			}

			previousDist = dist;
		}

		// Divide the number of occurences by the spread so even if a note has many times the searched terms
		// but these terms are very spread appart, they'll be given a lower weight than a note that has the
		// terms once or twice but just next to each others.
		return occurenceCount / spread;
	}

	orderResults_(rows) {
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const offsets = row.offsets.split(' ').map(o => Number(o));
			row.weight = this.calculateWeight_(offsets);
			// row.colIndexes = this.columnIndexesFromOffsets_(offsets);
			// row.offsets = offsets;
		}

		rows.sort((a, b) => {
			if (a.weight < b.weight) return +1;
			if (a.weight > b.weight) return -1;
			return 0;
		});
	}

	async search(query) {
		const sql = 'SELECT id, title, offsets(notes_fts) AS offsets FROM notes_fts WHERE notes_fts MATCH ?'
		const rows = await this.db().selectAll(sql, [query]);
		this.orderResults_(rows);
		return rows;
	}

	static runInBackground() {
		if (this.isRunningInBackground_) return;

		this.isRunningInBackground_ = true;

		setTimeout(() => {
			SearchEngine.instance().updateFtsTables();
		}, 1000 * 30);
		
		shim.setInterval(() => {
			SearchEngine.instance().updateFtsTables();
		}, 1000 * 60 * 30);
	}

}

module.exports = SearchEngine;