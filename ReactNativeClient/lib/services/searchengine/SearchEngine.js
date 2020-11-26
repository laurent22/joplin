const { Logger } = require('lib/logger.js');
const ItemChange = require('lib/models/ItemChange.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const ItemChangeUtils = require('lib/services/ItemChangeUtils');
const { pregQuote, scriptType } = require('lib/string-utils.js');
const removeDiacritics = require('diacritics').remove;
const { sprintf } = require('sprintf-js');
const filterParser = require('./filterParser').default;
const queryBuilder = require('./queryBuilder').default;

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
			const notes = await Note.modelSelectAll(`
				SELECT ${SearchEngine.relevantFields}
				FROM notes
				WHERE id IN ("${currentIds.join('","')}") AND is_conflict = 0 AND encryption_applied = 0`);
			const queries = [];

			for (let i = 0; i < notes.length; i++) {
				const note = notes[i];
				const n = this.normalizeNote_(note);
				queries.push({ sql: `
				INSERT INTO notes_normalized(${SearchEngine.relevantFields})
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				params: [n.id, n.title, n.body, n.user_created_time, n.user_updated_time, n.is_todo, n.todo_completed, n.parent_id, n.latitude, n.longitude, n.altitude, n.source_url] }
				);
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
				const notes = await Note.modelSelectAll(`
					SELECT ${SearchEngine.relevantFields}
					FROM notes WHERE id IN ("${noteIds.join('","')}") AND is_conflict = 0 AND encryption_applied = 0`
				);

				const queries = [];

				for (let i = 0; i < changes.length; i++) {
					const change = changes[i];

					if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
						queries.push({ sql: 'DELETE FROM notes_normalized WHERE id = ?', params: [change.item_id] });
						const note = this.noteById_(notes, change.item_id);
						if (note) {
							const n = this.normalizeNote_(note);
							queries.push({ sql: `
							INSERT INTO notes_normalized(${SearchEngine.relevantFields})
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
							params: [change.item_id, n.title, n.body, n.user_created_time, n.user_updated_time, n.is_todo, n.todo_completed, n.parent_id, n.latitude, n.longitude, n.altitude, n.source_url] });
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

	fieldNamesFromOffsets_(offsets) {
		const notesNormalizedFieldNames = this.db().tableFieldNames('notes_normalized');
		const occurenceCount = Math.floor(offsets.length / 4);
		const output = [];
		for (let i = 0; i < occurenceCount; i++) {
			const colIndex = offsets[i * 4];
			const fieldName = notesNormalizedFieldNames[colIndex];
			if (!output.includes(fieldName)) output.push(fieldName);
		}

		return output;
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



	calculateWeightBM25_(rows) {
		// https://www.sqlite.org/fts3.html#matchinfo
		// pcnalx are the arguments passed to matchinfo
		// p - The number of matchable phrases in the query.
		// c - The number of user defined columns in the FTS table
		// n - The number of rows in the FTS4 table.
		// a - avg number of tokens in the text values stored in the column.
		// l - For each column, the length of the value stored in the current
		// row of the FTS4 table, in tokens.
		// x - For each distinct combination of a phrase and table column, the
		// following three values:
		// hits_this_row
		// hits_all_rows
		// docs_with_hits

		if (rows.length === 0) return;

		const matchInfo = rows.map(row => new Uint32Array(row.matchinfo.buffer));
		const generalInfo = matchInfo[0];

		const K1 = 1.2;
		const B = 0.75;

		const TITLE_COLUMN = 1;
		const BODY_COLUMN = 2;
		const columns = [TITLE_COLUMN, BODY_COLUMN];
		// const NUM_COLS = 12;

		const numPhrases = generalInfo[0]; // p
		const numColumns = generalInfo[1]; // c
		const numRows = generalInfo[2]; // n

		const avgTitleTokens = generalInfo[4]; // a
		const avgBodyTokens = generalInfo[5];
		const avgTokens = [null, avgTitleTokens, avgBodyTokens]; // we only need cols 1 and 2

		const numTitleTokens = matchInfo.map(m => m[4 + numColumns]); // l
		const numBodyTokens = matchInfo.map(m => m[5 + numColumns]);
		const numTokens = [null, numTitleTokens, numBodyTokens];

		const X = matchInfo.map(m => m.slice(27)); // x

		const hitsThisRow = (array, c, p) => array[3 * (c + p * numColumns) + 0];
		// const hitsAllRows = (array, c, p) => array[3 * (c + p*NUM_COLS) + 1];
		const docsWithHits = (array, c, p) => array[3 * (c + p * numColumns) + 2];


		// if a term occurs in over half the documents in the collection
		// then this model gives a negative term weight, which is presumably undesirable.
		// But, assuming the use of a stop list, this normally doesn't happen,
		// and the value for each summand can be given a floor of 0.
		const IDF = (n, N) => Math.max(Math.log((N - n + 0.5) / (n + 0.5)), 0);

		// https://en.wikipedia.org/wiki/Okapi_BM25
		const BM25 = (idf, freq, numTokens, avgTokens) => {
			if (avgTokens === 0) {
				return 0; // To prevent division by zero
			}
			return idf * (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (numTokens / avgTokens)));
		};

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			row.weight = 0;
			for (let j = 0; j < numPhrases; j++) {
				columns.forEach(column => {
					const rowsWithHits = docsWithHits(X[i], column, j);
					const frequencyHits = hitsThisRow(X[i], column, j);

					const idf = IDF(rowsWithHits, numRows);
					row.weight += BM25(idf, frequencyHits, numTokens[column][i], avgTokens[column]);
				});
			}
		}
	}

	processBasicSearchResults_(rows, parsedQuery) {
		const valueRegexs = parsedQuery.keys.includes('_') ? parsedQuery.terms['_'].map(term => term.valueRegex || term.value) : [];
		const isTitleSearch = parsedQuery.keys.includes('title');
		const isOnlyTitle = parsedQuery.keys.length === 1 && isTitleSearch;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const testTitle = regex => new RegExp(regex, 'ig').test(row.title);
			const matchedFields = {
				title: isTitleSearch || valueRegexs.some(testTitle),
				body: !isOnlyTitle,
			};

			row.fields = Object.keys(matchedFields).filter(key => matchedFields[key]);
			row.weight = 0;
		}
	}

	processResults_(rows, parsedQuery, isBasicSearchResults = false) {
		if (isBasicSearchResults) {
			this.processBasicSearchResults_(rows, parsedQuery);
		} else {
			this.calculateWeightBM25_(rows);
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				const offsets = row.offsets.split(' ').map(o => Number(o));
				row.fields = this.fieldNamesFromOffsets_(offsets);
			}
		}


		rows.sort((a, b) => {
			if (a.fields.includes('title') && !b.fields.includes('title')) return -1;
			if (!a.fields.includes('title') && b.fields.includes('title')) return +1;
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
		const trimQuotes = (str) => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

		let allTerms = [];
		try {
			allTerms = filterParser(query);
		} catch (error) {
			console.warn(error);
		}

		const textTerms = allTerms.filter(x => x.name === 'text').map(x => trimQuotes(x.value));
		const titleTerms = allTerms.filter(x => x.name === 'title').map(x => trimQuotes(x.value));
		const bodyTerms = allTerms.filter(x => x.name === 'body').map(x => trimQuotes(x.value));

		const terms = { _: textTerms, 'title': titleTerms, 'body': bodyTerms };

		// Filter terms:
		// - Convert wildcards to regex
		// - Remove columns with no results
		// - Add count of terms

		let termCount = 0;
		const keys = [];
		for (const col in terms) {
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
			terms: terms, // text terms
			allTerms: allTerms,
		};
	}

	allParsedQueryTerms(parsedQuery) {
		if (!parsedQuery || !parsedQuery.termCount) return [];

		let output = [];
		for (const col in parsedQuery.terms) {
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
			if (parsedQuery.terms[key].length === 0) continue;

			const term = parsedQuery.terms[key][0].value;
			if (key === '_') searchOptions.anywherePattern = `*${term}*`;
			if (key === 'title') searchOptions.titlePattern = `*${term}*`;
			if (key === 'body') searchOptions.bodyPattern = `*${term}*`;
		}

		return Note.previews(null, searchOptions);
	}

	determineSearchType_(query, preferredSearchType) {
		if (preferredSearchType === SearchEngine.SEARCH_TYPE_BASIC) return SearchEngine.SEARCH_TYPE_BASIC;

		// If preferredSearchType is "fts" we auto-detect anyway
		// because it's not always supported.

		const st = scriptType(query);

		if (!Setting.value('db.ftsEnabled') || ['ja', 'zh', 'ko', 'th'].indexOf(st) >= 0) {
			return SearchEngine.SEARCH_TYPE_BASIC;
		}

		return SearchEngine.SEARCH_TYPE_FTS;
	}

	async search(searchString, options = null) {
		options = Object.assign({}, {
			searchType: SearchEngine.SEARCH_TYPE_AUTO,
		}, options);

		searchString = this.normalizeText_(searchString);

		const searchType = this.determineSearchType_(searchString, options.searchType);

		if (searchType === SearchEngine.SEARCH_TYPE_BASIC) {
			// Non-alphabetical languages aren't support by SQLite FTS (except with extensions which are not available in all platforms)
			const rows = await this.basicSearch(searchString);
			const parsedQuery = this.parseQuery(searchString);
			this.processResults_(rows, parsedQuery, true);
			return rows;
		} else {
			// SEARCH_TYPE_FTS
			// FTS will ignore all special characters, like "-" in the index. So if
			// we search for "this-phrase" it won't find it because it will only
			// see "this phrase" in the index. Because of this, we remove the dashes
			// when searching.
			// https://github.com/laurent22/joplin/issues/1075#issuecomment-459258856

			const parsedQuery = this.parseQuery(searchString);

			try {
				const { query, params } = queryBuilder(parsedQuery.allTerms);
				const rows = await this.db().selectAll(query, params);
				this.processResults_(rows, parsedQuery);
				return rows;
			} catch (error) {
				this.logger().warn(`Cannot execute MATCH query: ${searchString}: ${error.message}`);
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
					this.instance_ = null;
					resolve();
				}
			}, 100);
		});
	}
}

SearchEngine.relevantFields = 'id, title, body, user_created_time, user_updated_time, is_todo, todo_completed, parent_id, latitude, longitude, altitude, source_url';

SearchEngine.instance_ = null;

SearchEngine.SEARCH_TYPE_AUTO = 'auto';
SearchEngine.SEARCH_TYPE_BASIC = 'basic';
SearchEngine.SEARCH_TYPE_FTS = 'fts';

module.exports = SearchEngine;
