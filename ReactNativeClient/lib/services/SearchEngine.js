const { Logger } = require('lib/logger.js');
const ItemChange = require('lib/models/ItemChange.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const ItemChangeUtils = require('lib/services/ItemChangeUtils');
const { pregQuote, scriptType } = require('lib/string-utils.js');
const removeDiacritics = require('diacritics').remove;
const { sprintf } = require('sprintf-js');

class SearchEngine {
	constructor() {
		this.dispatch = () => {};
		this.logger_ = new Logger();
		this.db_ = null;
		this.isIndexing_ = false;
		this.syncCalls_ = [];
	}

	static instance() {
		if (SearchEngine.instance_) return SearchEngine.instance_;
		SearchEngine.instance_ = new SearchEngine();
		return SearchEngine.instance_;
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

	noteById_(notes, noteId) {
		for (let i = 0; i < notes.length; i++) {
			if (notes[i].id === noteId) return notes[i];
		}
		// The note may have been deleted since the change was recorded. For example in this case:
		// - Note created (Some Change object is recorded)
		// - Note is deleted
		// - ResourceService indexer runs.
		// In that case, there will be a change for the note, but the note will be gone.
		return null;
	}

	async rebuildIndex_() {
		let noteIds = await this.db().selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND encryption_applied = 0');
		noteIds = noteIds.map(n => n.id);

		const lastChangeId = await ItemChange.lastChangeId();

		// First delete content of note_normalized, in case the previous initial indexing failed
		await this.db().exec('DELETE FROM notes_normalized');

		while (noteIds.length) {
			const currentIds = noteIds.splice(0, 100);
			const notes = await Note.modelSelectAll(`SELECT id, title, body FROM notes WHERE id IN ("${currentIds.join('","')}") AND is_conflict = 0 AND encryption_applied = 0`);
			const queries = [];

			for (let i = 0; i < notes.length; i++) {
				const note = notes[i];
				const n = this.normalizeNote_(note);
				queries.push({ sql: 'INSERT INTO notes_normalized(id, title, body) VALUES (?, ?, ?)', params: [n.id, n.title, n.body] });
			}

			await this.db().transactionExecBatch(queries);
		}

		Setting.setValue('searchEngine.lastProcessedChangeId', lastChangeId);
	}

	scheduleSyncTables() {
		if (this.scheduleSyncTablesIID_) return;

		this.scheduleSyncTablesIID_ = setTimeout(async () => {
			try {
				await this.syncTables();
			} catch (error) {
				this.logger().error('SearchEngine::scheduleSyncTables: Error while syncing tables:', error);
			}
			this.scheduleSyncTablesIID_ = null;
		}, 10000);
	}

	async rebuildIndex() {
		Setting.setValue('searchEngine.lastProcessedChangeId', 0);
		Setting.setValue('searchEngine.initialIndexingDone', false);
		return this.syncTables();
	}

	async syncTables_() {
		if (this.isIndexing_) return;

		this.isIndexing_ = true;

		this.logger().info('SearchEngine: Updating FTS table...');

		await ItemChange.waitForAllSaved();

		if (!Setting.value('searchEngine.initialIndexingDone')) {
			await this.rebuildIndex_();
			Setting.setValue('searchEngine.initialIndexingDone', true);
			this.isIndexing_ = false;
			return;
		}

		const startTime = Date.now();

		const report = {
			inserted: 0,
			deleted: 0,
		};

		let lastChangeId = Setting.value('searchEngine.lastProcessedChangeId');

		try {
			while (true) {
				const changes = await ItemChange.modelSelectAll(
					`
					SELECT id, item_id, type
					FROM item_changes
					WHERE item_type = ?
					AND id > ?
					ORDER BY id ASC
					LIMIT 10
				`,
					[BaseModel.TYPE_NOTE, lastChangeId]
				);

				if (!changes.length) break;

				const noteIds = changes.map(a => a.item_id);
				const notes = await Note.modelSelectAll(`SELECT id, title, body FROM notes WHERE id IN ("${noteIds.join('","')}") AND is_conflict = 0 AND encryption_applied = 0`);
				const queries = [];

				for (let i = 0; i < changes.length; i++) {
					const change = changes[i];

					if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
						queries.push({ sql: 'DELETE FROM notes_normalized WHERE id = ?', params: [change.item_id] });
						const note = this.noteById_(notes, change.item_id);
						if (note) {
							const n = this.normalizeNote_(note);
							queries.push({ sql: 'INSERT INTO notes_normalized(id, title, body) VALUES (?, ?, ?)', params: [change.item_id, n.title, n.body] });
							report.inserted++;
						}
					} else if (change.type === ItemChange.TYPE_DELETE) {
						queries.push({ sql: 'DELETE FROM notes_normalized WHERE id = ?', params: [change.item_id] });
						report.deleted++;
					} else {
						throw new Error(`Invalid change type: ${change.type}`);
					}

					lastChangeId = change.id;
				}

				await this.db().transactionExecBatch(queries);
				Setting.setValue('searchEngine.lastProcessedChangeId', lastChangeId);
				await Setting.saveAll();
			}
		} catch (error) {
			this.logger().error('SearchEngine: Error while processing changes:', error);
		}

		await ItemChangeUtils.deleteProcessedChanges();

		this.logger().info(sprintf('SearchEngine: Updated FTS table in %dms. Inserted: %d. Deleted: %d', Date.now() - startTime, report.inserted, report.deleted));

		this.isIndexing_ = false;
	}

	async syncTables() {
		this.syncCalls_.push(true);
		try {
			await this.syncTables_();
		} finally {
			this.syncCalls_.pop();
		}
	}

	async countRows() {
		const sql = 'SELECT count(*) as total FROM notes_fts';
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

	calculateWeight_(offsets, termCount) {
		// Offset doc: https://www.sqlite.org/fts3.html#offsets

		// - If there's only one term in the query string, the content with the most matches goes on top
		// - If there are multiple terms, the result with the most occurences that are closest to each others go on top.
		//   eg. if query is "abcd efgh", "abcd efgh" will go before "abcd XX efgh".

		const occurenceCount = Math.floor(offsets.length / 4);

		if (termCount === 1) return occurenceCount;

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

	orderResults_(rows, parsedQuery) {
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const offsets = row.offsets.split(' ').map(o => Number(o));
			row.weight = this.calculateWeight_(offsets, parsedQuery.termCount);
			// row.colIndexes = this.columnIndexesFromOffsets_(offsets);
			// row.offsets = offsets;
		}

		rows.sort((a, b) => {
			if (a.weight < b.weight) return +1;
			if (a.weight > b.weight) return -1;
			if (a.is_todo && a.todo_completed) return +1;
			if (b.is_todo && b.todo_completed) return -1;
			if (a.user_updated_time < b.user_updated_time) return +1;
			if (a.user_updated_time > b.user_updated_time) return -1;
			return 0;
		});
	}

	// https://stackoverflow.com/a/13818704/561309
	queryTermToRegex(term) {
		while (term.length && term.indexOf('*') === 0) {
			term = term.substr(1);
		}

		let regexString = pregQuote(term);
		if (regexString[regexString.length - 1] === '*') {
			regexString = `${regexString.substr(0, regexString.length - 2)}[^${pregQuote(' \t\n\r,.,+-*?!={}<>|:"\'()[]')}]` + '*?';
			// regexString = regexString.substr(0, regexString.length - 2) + '.*?';
		}

		return regexString;
	}

	parseQuery(query) {
		const terms = { _: [] };

		let inQuote = false;
		let currentCol = '_';
		let currentTerm = '';
		for (let i = 0; i < query.length; i++) {
			const c = query[i];

			if (c === '"') {
				if (inQuote) {
					terms[currentCol].push(currentTerm);
					currentTerm = '';
					inQuote = false;
				} else {
					inQuote = true;
				}
				continue;
			}

			if (c === ' ' && !inQuote) {
				if (!currentTerm) continue;
				terms[currentCol].push(currentTerm);
				currentCol = '_';
				currentTerm = '';
				continue;
			}

			if (c === ':' && !inQuote) {
				currentCol = currentTerm;
				if (!terms[currentCol]) terms[currentCol] = [];
				currentTerm = '';
				continue;
			}

			currentTerm += c;
		}

		if (currentTerm) terms[currentCol].push(currentTerm);

		// Filter terms:
		// - Convert wildcards to regex
		// - Remove columns with no results
		// - Add count of terms

		let termCount = 0;
		const keys = [];
		for (let col in terms) {
			if (!terms.hasOwnProperty(col)) continue;

			if (!terms[col].length) {
				delete terms[col];
				continue;
			}

			for (let i = terms[col].length - 1; i >= 0; i--) {
				const term = terms[col][i];

				// SQlLite FTS doesn't allow "*" queries and neither shall we
				if (term === '*') {
					terms[col].splice(i, 1);
					continue;
				}

				if (term.indexOf('*') >= 0) {
					terms[col][i] = { type: 'regex', value: term, scriptType: scriptType(term), valueRegex: this.queryTermToRegex(term) };
				} else {
					terms[col][i] = { type: 'text', value: term, scriptType: scriptType(term) };
				}
			}

			termCount += terms[col].length;

			keys.push(col);
		}

		return {
			termCount: termCount,
			keys: keys,
			terms: terms,
		};
	}

	allParsedQueryTerms(parsedQuery) {
		if (!parsedQuery || !parsedQuery.termCount) return [];

		let output = [];
		for (let col in parsedQuery.terms) {
			if (!parsedQuery.terms.hasOwnProperty(col)) continue;
			output = output.concat(parsedQuery.terms[col]);
		}
		return output;
	}

	normalizeText_(text) {
		const normalizedText = text.normalize ? text.normalize() : text;
		return removeDiacritics(normalizedText.toLowerCase());
	}

	normalizeNote_(note) {
		const n = Object.assign({}, note);
		n.title = this.normalizeText_(n.title);
		n.body = this.normalizeText_(n.body);
		return n;
	}

	async basicSearch(query) {
		query = query.replace(/\*/, '');
		const parsedQuery = this.parseQuery(query);
		const searchOptions = {};

		for (const key of parsedQuery.keys) {
			const term = parsedQuery.terms[key][0].value;
			if (key === '_') searchOptions.anywherePattern = `*${term}*`;
			if (key === 'title') searchOptions.titlePattern = `*${term}*`;
			if (key === 'body') searchOptions.bodyPattern = `*${term}*`;
		}

		return Note.previews(null, searchOptions);
	}

	async search(query) {
		query = this.normalizeText_(query);
		query = query.replace(/-/g, ' '); // https://github.com/laurent22/joplin/issues/1075#issuecomment-459258856

		const st = scriptType(query);

		if (!Setting.value('db.ftsEnabled') || ['ja', 'zh', 'ko', 'th'].indexOf(st) >= 0) {
			// Non-alphabetical languages aren't support by SQLite FTS (except with extensions which are not available in all platforms)
			return this.basicSearch(query);
		} else {
			const parsedQuery = this.parseQuery(query);
			const sql = 'SELECT notes_fts.id, notes_fts.title AS normalized_title, offsets(notes_fts) AS offsets, notes.title, notes.user_updated_time, notes.is_todo, notes.todo_completed, notes.parent_id FROM notes_fts LEFT JOIN notes ON notes_fts.id = notes.id WHERE notes_fts MATCH ?';
			try {
				const rows = await this.db().selectAll(sql, [query]);
				this.orderResults_(rows, parsedQuery);
				return rows;
			} catch (error) {
				this.logger().warn(`Cannot execute MATCH query: ${query}: ${error.message}`);
				return [];
			}
		}
	}

	async destroy() {
		if (this.scheduleSyncTablesIID_) {
			clearTimeout(this.scheduleSyncTablesIID_);
			this.scheduleSyncTablesIID_ = null;
		}
		SearchEngine.instance_ = null;

		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.syncCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}
}

SearchEngine.instance_ = null;

module.exports = SearchEngine;
