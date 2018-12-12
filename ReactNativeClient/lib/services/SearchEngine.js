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
			return 0;
		});
	}

	// https://stackoverflow.com/a/13818704/561309
	queryTermToRegex(term) {
		const preg_quote = (str, delimiter) => {
			return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
		}
		const regexString = preg_quote(term).replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
		return new RegExp(regexString, 'gmi');
	}

	parseQuery(query) {
		const terms = {_:[]};
		
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
				terms[currentCol] = [];
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
					terms[col][i] = this.queryTermToRegex(term);
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

	async search(query) {
		const parsedQuery = this.parseQuery(query);
		const sql = 'SELECT id, title, offsets(notes_fts) AS offsets FROM notes_fts WHERE notes_fts MATCH ?'
		const rows = await this.db().selectAll(sql, [query]);
		this.orderResults_(rows, parsedQuery);
		return rows;
	}
	
}

module.exports = SearchEngine;