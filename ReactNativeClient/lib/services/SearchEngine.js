const { Logger } = require('lib/logger.js');

class SearchEngine {

	constructor() {
		this.dispatch = (action) => {};
		this.logger_ = new Logger();
		this.db_ = null;
	}
	
	async updateFtsTables() {
		// CREATE VIRTUAL TABLE notes_fts USING fts4(content="notes", title, body);
		// INSERT INTO notes_fts(docid, title, body) SELECT rowid, title, body FROM notes;
		// SELECT title, offsets(notes_fts) length(offsets(notes_fts)) - length(replace(offsets(notes_fts), ' ', '')) + 1
		// FROM notes_fts
		// WHERE notes_fts
		// MATCH 'test';

		await this.db().exec('CREATE VIRTUAL TABLE notes_fts USING fts4(content="notes", title, body)');
		await this.db().exec('INSERT INTO notes_fts(docid, title, body) SELECT rowid, title, body FROM notes;');

		
		const sql = `SELECT docid, title, offsets(notes_fts) as offsets FROM notes_fts WHERE notes_fts MATCH "abcd efgh" `;

		const rows = await this.db().selectAll(sql);

		const calculateWeight = (offsets) => {
			// Offset doc: https://www.sqlite.org/fts3.html#offsets
			
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

			// Divide the number of occureances by the spread so even if a note has many times the searched terms
			// but these terms are very spread appart, they'll be given a lower weight than a note that has the
			// terms once or twice but just next to each others.
			return occurenceCount / spread;
		}

		const orderResults = (rows) => {
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				row.weight = calculateWeight(row.offsets.split(' ').map(o => Number(o)));
			}

			rows.sort((a, b) => {
				if (a.weight < b.weight) return +1;
				if (a.weight > b.weight) return -1;
				return 0;
			});
		}

		orderResults(rows);

		console.info(rows);

		// console.info(rows);
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

}

module.exports = SearchEngine;