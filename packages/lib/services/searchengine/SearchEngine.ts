import Logger from '@joplin/utils/Logger';
import ItemChange from '../../models/ItemChange';
import Setting from '../../models/Setting';
import Note from '../../models/Note';
import BaseModel, { ModelType } from '../../BaseModel';
import ItemChangeUtils from '../ItemChangeUtils';
import shim from '../../shim';
import filterParser, { Term } from './filterParser';
import queryBuilder from './queryBuilder';
import { ItemChangeEntity, NoteEntity } from '../database/types';
import JoplinDatabase from '../../JoplinDatabase';
import isItemId from '../../models/utils/isItemId';
import BaseItem from '../../models/BaseItem';
import { isCallbackUrl, parseCallbackUrl } from '../../callbackUrlUtils';
const { sprintf } = require('sprintf-js');
const { pregQuote, scriptType, removeDiacritics } = require('../../string-utils.js');

enum SearchType {
	Auto = 'auto',
	Basic = 'basic',
	Nonlatin = 'nonlatin',
	Fts = 'fts',
}

interface SearchOptions {
	searchType: SearchType;

	// When this is on, the search engine automatically appends "*" to each word
	// of the query. So "hello world" is turned into "hello* world*". This
	// allows returning results quickly, in particular on mobile, and it seems
	// to be what users generally expect.
	appendWildCards?: boolean;
}

export interface ProcessResultsRow {
	id: string;
	parent_id: string;
	title: string;
	offsets: string;
	user_updated_time: number;
	user_created_time: number;
	matchinfo: Buffer;
	item_type?: ModelType;
	fields?: string[];
	weight?: number;
	is_todo?: number;
	todo_completed?: number;
}

export interface ComplexTerm {
	type: 'regex' | 'text';
	value: string;
	scriptType: any;
	valueRegex?: RegExp;
}

export interface Terms {
	_: (string | ComplexTerm)[];
	title: (string | ComplexTerm)[];
	body: (string | ComplexTerm)[];
}

export default class SearchEngine {

	public static instance_: SearchEngine = null;
	public static relevantFields = 'id, title, body, user_created_time, user_updated_time, is_todo, todo_completed, todo_due, parent_id, latitude, longitude, altitude, source_url';
	public static SEARCH_TYPE_AUTO = SearchType.Auto;
	public static SEARCH_TYPE_BASIC = SearchType.Basic;
	public static SEARCH_TYPE_NONLATIN_SCRIPT = SearchType.Nonlatin;
	public static SEARCH_TYPE_FTS = SearchType.Fts;

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public dispatch: Function = (_o: any) => {};
	private logger_ = new Logger();
	private db_: JoplinDatabase = null;
	private isIndexing_ = false;
	private syncCalls_: any[] = [];
	private scheduleSyncTablesIID_: any;

	public static instance() {
		if (SearchEngine.instance_) return SearchEngine.instance_;
		SearchEngine.instance_ = new SearchEngine();
		return SearchEngine.instance_;
	}

	public setLogger(logger: Logger) {
		this.logger_ = logger;
	}

	public logger() {
		return this.logger_;
	}

	public setDb(db: any) {
		this.db_ = db;
	}

	public db() {
		return this.db_;
	}

	private noteById_(notes: NoteEntity[], noteId: string) {
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

	private async rebuildIndex_() {
		const notes = await this.db().selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND encryption_applied = 0');
		const noteIds = notes.map(n => n.id);

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
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				params: [n.id, n.title, n.body, n.user_created_time, n.user_updated_time, n.is_todo, n.todo_completed, n.todo_due, n.parent_id, n.latitude, n.longitude, n.altitude, n.source_url] },
				);
			}

			await this.db().transactionExecBatch(queries);
		}

		Setting.setValue('searchEngine.lastProcessedChangeId', lastChangeId);
	}

	public scheduleSyncTables() {
		if (this.scheduleSyncTablesIID_) return;

		this.scheduleSyncTablesIID_ = shim.setTimeout(async () => {
			try {
				await this.syncTables();
			} catch (error) {
				this.logger().error('SearchEngine::scheduleSyncTables: Error while syncing tables:', error);
			}
			this.scheduleSyncTablesIID_ = null;
		}, 10000);
	}

	public async rebuildIndex() {
		Setting.setValue('searchEngine.lastProcessedChangeId', 0);
		Setting.setValue('searchEngine.initialIndexingDone', false);
		return this.syncTables();
	}

	private async syncTables_() {
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
				const changes: ItemChangeEntity[] = await ItemChange.modelSelectAll(
					`
					SELECT id, item_id, type
					FROM item_changes
					WHERE item_type = ?
					AND id > ?
					ORDER BY id ASC
					LIMIT 10
				`,
					[BaseModel.TYPE_NOTE, lastChangeId],
				);

				if (!changes.length) break;

				const queries = [];

				const noteIds = changes.map(a => a.item_id);
				const notes = await Note.modelSelectAll(`
					SELECT ${SearchEngine.relevantFields}
					FROM notes WHERE id IN ("${noteIds.join('","')}") AND is_conflict = 0 AND encryption_applied = 0`,
				);

				for (let i = 0; i < changes.length; i++) {
					const change = changes[i];

					if (change.type === ItemChange.TYPE_CREATE || change.type === ItemChange.TYPE_UPDATE) {
						queries.push({ sql: 'DELETE FROM notes_normalized WHERE id = ?', params: [change.item_id] });
						const note = this.noteById_(notes, change.item_id);
						if (note) {
							const n = this.normalizeNote_(note);
							queries.push({ sql: `
							INSERT INTO notes_normalized(${SearchEngine.relevantFields})
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
							params: [change.item_id, n.title, n.body, n.user_created_time, n.user_updated_time, n.is_todo, n.todo_completed, n.todo_due, n.parent_id, n.latitude, n.longitude, n.altitude, n.source_url] });
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

	public async syncTables() {
		this.syncCalls_.push(true);
		try {
			await this.syncTables_();
		} finally {
			this.syncCalls_.pop();
		}
	}

	public async countRows() {
		const sql = 'SELECT count(*) as total FROM notes_fts';
		const row = await this.db().selectOne(sql);
		return row && row['total'] ? row['total'] : 0;
	}

	private fieldNamesFromOffsets_(offsets: any[]) {
		const notesNormalizedFieldNames = this.db().tableFieldNames('notes_normalized');
		const occurenceCount = Math.floor(offsets.length / 4);
		const output: string[] = [];
		for (let i = 0; i < occurenceCount; i++) {
			const colIndex = offsets[i * 4];
			const fieldName = notesNormalizedFieldNames[colIndex];
			if (!output.includes(fieldName)) output.push(fieldName);
		}

		return output;
	}

	// protected calculateWeight_(offsets: any[], termCount: number) {
	// 	// Offset doc: https://www.sqlite.org/fts3.html#offsets

	// 	// - If there's only one term in the query string, the content with the most matches goes on top
	// 	// - If there are multiple terms, the result with the most occurences that are closest to each others go on top.
	// 	//   eg. if query is "abcd efgh", "abcd efgh" will go before "abcd XX efgh".

	// 	const occurenceCount = Math.floor(offsets.length / 4);

	// 	if (termCount === 1) return occurenceCount;

	// 	let spread = 0;
	// 	let previousDist = null;
	// 	for (let i = 0; i < occurenceCount; i++) {
	// 		const dist = offsets[i * 4 + 2];

	// 		if (previousDist !== null) {
	// 			const delta = dist - previousDist;
	// 			spread += delta;
	// 		}

	// 		previousDist = dist;
	// 	}

	// 	// Divide the number of occurences by the spread so even if a note has many times the searched terms
	// 	// but these terms are very spread appart, they'll be given a lower weight than a note that has the
	// 	// terms once or twice but just next to each others.
	// 	return occurenceCount / spread;
	// }



	private calculateWeightBM25_(rows: ProcessResultsRow[]) {
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

		const numPhrases = generalInfo[0]; // p
		const numColumns = generalInfo[1]; // c
		const numRows = generalInfo[2]; // n

		const avgTitleTokens = generalInfo[4]; // a
		const avgBodyTokens = generalInfo[5];
		const avgTokens = [null, avgTitleTokens, avgBodyTokens]; // we only need cols 1 and 2

		const numTitleTokens = matchInfo.map(m => m[4 + numColumns]); // l
		const numBodyTokens = matchInfo.map(m => m[5 + numColumns]);
		const numTokens = [null, numTitleTokens, numBodyTokens];

		// In byte size, we have for notes_normalized:
		//
		// p 1
		// c 1
		// n 1
		// a 12
		// l 12
		const X = matchInfo.map(m => m.slice(1 + 1 + 1 + numColumns + numColumns)); // x

		const hitsThisRow = (array: any, c: number, p: number) => array[3 * (c + p * numColumns) + 0];
		// const hitsAllRows = (array, c, p) => array[3 * (c + p*NUM_COLS) + 1];
		const docsWithHits = (array: any, c: number, p: number) => array[3 * (c + p * numColumns) + 2];

		const IDF = (n: number, N: number) => Math.max(Math.log(((N - n + 0.5) / (n + 0.5)) + 1), 0);

		// https://en.wikipedia.org/wiki/Okapi_BM25
		const BM25 = (idf: number, freq: number, numTokens: number, avgTokens: number) => {
			if (avgTokens === 0) {
				return 0; // To prevent division by zero
			}
			return idf * (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (numTokens / avgTokens)));
		};

		const msSinceEpoch = Math.round(new Date().getTime());
		const msPerDay = 86400000;
		const weightForDaysSinceLastUpdate = (row: ProcessResultsRow) => {
			// BM25 weights typically range 0-10, and last updated date should weight similarly, though prioritizing recency logarithmically.
			// An alpha of 200 ensures matches in the last week will show up front (11.59) and often so for matches within 2 weeks (5.99),
			// but is much less of a factor at 30 days (2.84) or very little after 90 days (0.95), focusing mostly on content at that point.
			if (!row.user_updated_time) {
				return 0;
			}

			const alpha = 200;
			const daysSinceLastUpdate = (msSinceEpoch - row.user_updated_time) / msPerDay;
			return alpha * Math.log(1 + 1 / Math.max(daysSinceLastUpdate, 0.5));
		};

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			row.weight = 0;
			for (let j = 0; j < numPhrases; j++) {
				// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
				columns.forEach(column => {
					const rowsWithHits = docsWithHits(X[i], column, j);
					const frequencyHits = hitsThisRow(X[i], column, j);
					const idf = IDF(rowsWithHits, numRows);

					row.weight += BM25(idf, frequencyHits, numTokens[column][i], avgTokens[column]);
				});
			}

			row.weight += weightForDaysSinceLastUpdate(row);
		}
	}

	private processBasicSearchResults_(rows: any[], parsedQuery: any) {
		const valueRegexs = parsedQuery.keys.includes('_') ? parsedQuery.terms['_'].map((term: any) => term.valueRegex || term.value) : [];
		const isTitleSearch = parsedQuery.keys.includes('title');
		const isOnlyTitle = parsedQuery.keys.length === 1 && isTitleSearch;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const testTitle = (regex: any) => new RegExp(regex, 'ig').test(row.title);
			const matchedFields: any = {
				title: isTitleSearch || valueRegexs.some(testTitle),
				body: !isOnlyTitle,
			};

			row.fields = Object.keys(matchedFields).filter((key: any) => matchedFields[key]);
			row.weight = 0;
			row.fuzziness = 0;
		}
	}

	private processResults_(rows: ProcessResultsRow[], parsedQuery: any, isBasicSearchResults = false) {
		if (isBasicSearchResults) {
			this.processBasicSearchResults_(rows, parsedQuery);
		} else {
			this.calculateWeightBM25_(rows);
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				const offsets = row.offsets.split(' ').map((o: any) => Number(o));
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
	public queryTermToRegex(term: any) {
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

	public async parseQuery(query: string) {

		const trimQuotes = (str: string) => str.startsWith('"') ? str.substr(1, str.length - 2) : str;

		let allTerms: Term[] = [];

		try {
			allTerms = filterParser(query);
		} catch (error) {
			console.warn(error);
		}

		const textTerms = allTerms.filter(x => x.name === 'text' && !x.negated).map(x => trimQuotes(x.value));
		const titleTerms = allTerms.filter(x => x.name === 'title' && !x.negated).map(x => trimQuotes(x.value));
		const bodyTerms = allTerms.filter(x => x.name === 'body' && !x.negated).map(x => trimQuotes(x.value));

		const terms: Terms = { _: textTerms, 'title': titleTerms, 'body': bodyTerms };

		// Filter terms:
		// - Convert wildcards to regex
		// - Remove columns with no results
		// - Add count of terms

		let termCount = 0;
		const keys = [];
		for (const col2 in terms) {
			const col = col2 as '_' | 'title' | 'body';

			if (!terms.hasOwnProperty(col)) continue;

			if (!terms[col].length) {
				delete terms[col];
				continue;
			}

			for (let i = terms[col].length - 1; i >= 0; i--) {
				const term = terms[col][i] as string;

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

		//
		// The object "allTerms" is used for query construction purposes (this
		// contains all the filter terms) Since this is used for the FTS match
		// query, we need to normalize text, title and body terms. Note, we're
		// not normalizing terms like tag because these are matched using SQL
		// LIKE operator and so we must preserve their diacritics.
		//
		// The object "terms" only include text, title, body terms and is used
		// for highlighting. By not normalizing the text, title, body in
		// "terms", highlighting still works correctly for words with
		// diacritics.
		//

		allTerms = allTerms.map(x => {
			if (x.name === 'text' || x.name === 'title' || x.name === 'body') {
				return { ...x, value: this.normalizeText_(x.value) };
			}
			return x;
		});

		return {
			termCount: termCount,
			keys: keys,
			terms: terms, // text terms
			allTerms: allTerms,
			any: !!allTerms.find(term => term.name === 'any'),
		};
	}

	public allParsedQueryTerms(parsedQuery: any) {
		if (!parsedQuery || !parsedQuery.termCount) return [];

		let output: any[] = [];
		for (const col in parsedQuery.terms) {
			if (!parsedQuery.terms.hasOwnProperty(col)) continue;
			output = output.concat(parsedQuery.terms[col]);
		}
		return output;
	}

	private normalizeText_(text: string) {
		const normalizedText = text.normalize ? text.normalize() : text;
		return removeDiacritics(normalizedText.toLowerCase());
	}

	private normalizeNote_(note: NoteEntity) {
		const n = { ...note };
		n.title = this.normalizeText_(n.title);
		n.body = this.normalizeText_(n.body);
		return n;
	}

	public async basicSearch(query: string) {
		query = query.replace(/\*/, '');
		const parsedQuery = await this.parseQuery(query);
		const searchOptions: any = {};

		for (const key of parsedQuery.keys) {
			if ((parsedQuery.terms as any)[key].length === 0) continue;

			const term = (parsedQuery.terms as any)[key].map((x: Term) => x.value).join(' ');
			if (key === '_') searchOptions.anywherePattern = `*${term}*`;
			if (key === 'title') searchOptions.titlePattern = `*${term}*`;
			if (key === 'body') searchOptions.bodyPattern = `*${term}*`;
		}

		return Note.previews(null, searchOptions);
	}

	private determineSearchType_(query: string, preferredSearchType: any) {
		if (preferredSearchType === SearchEngine.SEARCH_TYPE_BASIC) return SearchEngine.SEARCH_TYPE_BASIC;
		if (preferredSearchType === SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT) return SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT;

		// If preferredSearchType is "fts" we auto-detect anyway
		// because it's not always supported.

		let allTerms: any[] = [];
		try {
			allTerms = filterParser(query);
		} catch (error) {
			console.warn(error);
		}

		const textQuery = allTerms.filter(x => x.name === 'text' || x.name === 'title' || x.name === 'body').map(x => x.value).join(' ');
		const st = scriptType(textQuery);

		if (!Setting.value('db.ftsEnabled')) {
			return SearchEngine.SEARCH_TYPE_BASIC;
		}

		// Non-alphabetical languages aren't support by SQLite FTS (except with extensions which are not available in all platforms)
		if (['ja', 'zh', 'ko', 'th'].indexOf(st) >= 0) {
			return SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT;
		}

		return SearchEngine.SEARCH_TYPE_FTS;
	}

	private async searchFromItemIds(searchString: string): Promise<ProcessResultsRow[]> {
		let itemId = '';

		if (isCallbackUrl(searchString)) {
			const parsed = parseCallbackUrl(searchString);
			itemId = parsed.params.id;
		} else if (isItemId(searchString)) {
			itemId = searchString;
		}

		if (itemId) {
			const item = await BaseItem.loadItemById(itemId);

			// We only return notes for now because the UI doesn't handle anything else.
			if (item && item.type_ === ModelType.Note) {
				return [
					{
						id: item.id,
						parent_id: item.parent_id || '',
						matchinfo: Buffer.from(''),
						offsets: '',
						title: item.title || item.id,
						user_updated_time: item.user_updated_time || item.updated_time,
						user_created_time: item.user_created_time || item.created_time,
						fields: ['id'],
					},
				];
			}
		}

		return [];
	}

	public async search(searchString: string, options: SearchOptions = null): Promise<ProcessResultsRow[]> {
		if (!searchString) return [];

		options = {
			searchType: SearchEngine.SEARCH_TYPE_AUTO,
			appendWildCards: false,
			...options,
		};

		const searchType = this.determineSearchType_(searchString, options.searchType);
		const parsedQuery = await this.parseQuery(searchString);

		let rows: ProcessResultsRow[] = [];

		if (searchType === SearchEngine.SEARCH_TYPE_BASIC) {
			searchString = this.normalizeText_(searchString);
			rows = await this.basicSearch(searchString);
			this.processResults_(rows, parsedQuery, true);
		} else {
			// SEARCH_TYPE_FTS
			// FTS will ignore all special characters, like "-" in the index. So if
			// we search for "this-phrase" it won't find it because it will only
			// see "this phrase" in the index. Because of this, we remove the dashes
			// when searching.
			// https://github.com/laurent22/joplin/issues/1075#issuecomment-459258856

			if (options.appendWildCards) {
				parsedQuery.allTerms = parsedQuery.allTerms.map(t => {
					if (t.name === 'text' && !t.wildcard) {
						t = {
							...t,
							wildcard: true,
							value: t.value.endsWith('"') ? `${t.value.substring(0, t.value.length - 1)}*"` : `${t.value}*`,
						};
					}
					return t;
				});
			}

			const useFts = searchType === SearchEngine.SEARCH_TYPE_FTS;
			try {
				const { query, params } = queryBuilder(parsedQuery.allTerms, useFts);
				rows = (await this.db().selectAll(query, params)) as ProcessResultsRow[];
				this.processResults_(rows, parsedQuery, !useFts);
			} catch (error) {
				this.logger().warn(`Cannot execute MATCH query: ${searchString}: ${error.message}`);
				rows = [];
			}
		}

		if (!rows.length) {
			rows = await this.searchFromItemIds(searchString);
		}

		return rows;
	}

	public async destroy() {
		if (this.scheduleSyncTablesIID_) {
			shim.clearTimeout(this.scheduleSyncTablesIID_);
			this.scheduleSyncTablesIID_ = null;
		}
		SearchEngine.instance_ = null;

		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!this.syncCalls_.length) {
					shim.clearInterval(iid);
					SearchEngine.instance_ = null;
					resolve(null);
				}
			}, 100);
		});
	}
}
