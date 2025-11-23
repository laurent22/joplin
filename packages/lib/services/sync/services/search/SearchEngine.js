"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const ItemChange_1 = require("../../models/ItemChange");
const Setting_1 = require("../../models/Setting");
const Note_1 = require("../../models/Note");
const BaseModel_1 = require("../../BaseModel");
const ItemChangeUtils_1 = require("../ItemChangeUtils");
const shim_1 = require("../../shim");
const filterParser_1 = require("./filterParser");
const queryBuilder_1 = require("./queryBuilder");
const Resource_1 = require("../../models/Resource");
const NoteResource_1 = require("../../models/NoteResource");
const BaseItem_1 = require("../../models/BaseItem");
const callbackUrlUtils_1 = require("../../callbackUrlUtils");
const replaceUnsupportedCharacters_1 = require("../../utils/replaceUnsupportedCharacters");
const html_1 = require("@joplin/utils/html");
const { sprintf } = require('sprintf-js');
const string_utils_1 = require("../../string-utils");
const PerformanceLogger_1 = require("../../PerformanceLogger");
const perfLogger = PerformanceLogger_1.default.create();
var SearchType;
(function (SearchType) {
    SearchType["Auto"] = "auto";
    SearchType["Basic"] = "basic";
    SearchType["Nonlatin"] = "nonlatin";
    SearchType["Fts"] = "fts";
})(SearchType || (SearchType = {}));
class SearchEngine {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
        this.dispatch = (_o) => { };
        this.logger_ = new Logger_1.default();
        this.db_ = null;
        this.isIndexing_ = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.syncCalls_ = [];
    }
    static instance() {
        if (SearchEngine.instance_)
            return SearchEngine.instance_;
        SearchEngine.instance_ = new SearchEngine();
        return SearchEngine.instance_;
    }
    setLogger(logger) {
        this.logger_ = logger;
    }
    logger() {
        return this.logger_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    setDb(db) {
        this.db_ = db;
    }
    db() {
        return this.db_;
    }
    noteById_(notes, noteId) {
        for (let i = 0; i < notes.length; i++) {
            if (notes[i].id === noteId)
                return notes[i];
        }
        // The note may have been deleted since the change was recorded. For example in this case:
        // - Note created (Some Change object is recorded)
        // - Note is deleted
        // - ResourceService indexer runs.
        // In that case, there will be a change for the note, but the note will be gone.
        return null;
    }
    async doInitialNoteIndexing_() {
        const notes = await this.db().selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND encryption_applied = 0 AND deleted_time = 0');
        const noteIds = notes.map(n => n.id);
        const lastChangeId = await ItemChange_1.default.lastChangeId();
        // First delete content of note_normalized, in case the previous initial indexing failed
        await this.db().exec('DELETE FROM notes_normalized');
        while (noteIds.length) {
            const currentIds = noteIds.splice(0, 100);
            const notes = await Note_1.default.modelSelectAll(`
				SELECT ${SearchEngine.relevantFields}
				FROM notes
				WHERE id IN (${BaseModel_1.default.escapeIdsForSql(currentIds)}) AND is_conflict = 0 AND encryption_applied = 0 AND deleted_time = 0`);
            const queries = [];
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const n = this.normalizeNote_(note);
                queries.push({ sql: `
				INSERT INTO notes_normalized(${SearchEngine.relevantFields})
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [n.id, n.title, n.body, n.user_created_time, n.user_updated_time, n.is_todo, n.todo_completed, n.todo_due, n.parent_id, n.latitude, n.longitude, n.altitude, n.source_url] });
            }
            await this.db().transactionExecBatch(queries);
        }
        Setting_1.default.setValue('searchEngine.lastProcessedChangeId', lastChangeId);
    }
    scheduleSyncTables() {
        if (this.scheduleSyncTablesIID_)
            return;
        this.scheduleSyncTablesIID_ = shim_1.default.setTimeout(async () => {
            try {
                await this.syncTables();
            }
            catch (error) {
                this.logger().error('SearchEngine::scheduleSyncTables: Error while syncing tables:', error);
            }
            this.scheduleSyncTablesIID_ = null;
        }, 10000);
    }
    async rebuildIndex() {
        Setting_1.default.setValue('searchEngine.lastProcessedChangeId', 0);
        Setting_1.default.setValue('searchEngine.initialIndexingDone', false);
        Setting_1.default.setValue('searchEngine.lastProcessedResource', '');
        return this.syncTables();
    }
    async syncTables_() {
        if (this.isIndexing_)
            return;
        const syncTask = perfLogger.taskStart('SearchEngine/syncTables');
        this.isIndexing_ = true;
        this.logger().info('SearchEngine: Updating FTS table...');
        await ItemChange_1.default.waitForAllSaved();
        if (!Setting_1.default.value('searchEngine.initialIndexingDone')) {
            await this.doInitialNoteIndexing_();
            Setting_1.default.setValue('searchEngine.initialIndexingDone', true);
        }
        const startTime = Date.now();
        const report = {
            inserted: 0,
            deleted: 0,
        };
        let lastChangeId = Setting_1.default.value('searchEngine.lastProcessedChangeId');
        try {
            while (true) {
                const changes = await ItemChange_1.default.modelSelectAll(`
					SELECT id, item_id, type
					FROM item_changes
					WHERE item_type = ?
					AND id > ?
					ORDER BY id ASC
					LIMIT 10
				`, [BaseModel_1.default.TYPE_NOTE, lastChangeId]);
                if (!changes.length)
                    break;
                const queries = [];
                const noteIds = changes.map(a => a.item_id);
                const notes = await Note_1.default.modelSelectAll(`
					SELECT ${SearchEngine.relevantFields}
					FROM notes WHERE id IN (${Note_1.default.escapeIdsForSql(noteIds)}) AND is_conflict = 0 AND encryption_applied = 0 AND deleted_time = 0`);
                for (let i = 0; i < changes.length; i++) {
                    const change = changes[i];
                    if (change.type === ItemChange_1.default.TYPE_CREATE || change.type === ItemChange_1.default.TYPE_UPDATE) {
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
                    }
                    else if (change.type === ItemChange_1.default.TYPE_DELETE) {
                        queries.push({ sql: 'DELETE FROM notes_normalized WHERE id = ?', params: [change.item_id] });
                        report.deleted++;
                    }
                    else {
                        throw new Error(`Invalid change type: ${change.type}`);
                    }
                    lastChangeId = change.id;
                }
                await this.db().transactionExecBatch(queries);
                Setting_1.default.setValue('searchEngine.lastProcessedChangeId', lastChangeId);
                await Setting_1.default.saveAll();
            }
        }
        catch (error) {
            this.logger().error('SearchEngine: Error while processing changes:', error);
        }
        await ItemChangeUtils_1.default.deleteProcessedChanges();
        const lastProcessedResource = !Setting_1.default.value('searchEngine.lastProcessedResource') ? { updated_time: 0, id: '' } : JSON.parse(Setting_1.default.value('searchEngine.lastProcessedResource'));
        this.logger().info('Updating items_normalized from', lastProcessedResource);
        try {
            while (true) {
                const resources = await Resource_1.default.allForNormalization(lastProcessedResource.updated_time, lastProcessedResource.id, 100, {
                    fields: ['id', 'title', 'ocr_text', 'updated_time'],
                });
                if (!resources.length)
                    break;
                const queries = [];
                for (const resource of resources) {
                    queries.push({
                        sql: 'DELETE FROM items_normalized WHERE item_id = ? AND item_type = ?',
                        params: [
                            resource.id,
                            BaseModel_1.ModelType.Resource,
                        ],
                    });
                    queries.push({
                        sql: `
							INSERT INTO items_normalized(item_id, item_type, title, body, user_updated_time)
							VALUES (?, ?, ?, ?, ?)`,
                        params: [
                            resource.id,
                            BaseModel_1.ModelType.Resource,
                            this.normalizeText_(resource.title),
                            this.normalizeText_(resource.ocr_text),
                            resource.updated_time,
                        ],
                    });
                    report.inserted++;
                    lastProcessedResource.id = resource.id;
                    lastProcessedResource.updated_time = resource.updated_time;
                }
                await this.db().transactionExecBatch(queries);
                Setting_1.default.setValue('searchEngine.lastProcessedResource', JSON.stringify(lastProcessedResource));
                await Setting_1.default.saveAll();
            }
        }
        catch (error) {
            this.logger().error('SearchEngine: Error while processing resources:', error);
        }
        this.logger().info(sprintf('SearchEngine: Updated FTS table in %dms. Inserted: %d. Deleted: %d', Date.now() - startTime, report.inserted, report.deleted));
        this.isIndexing_ = false;
        syncTask.onEnd();
    }
    async syncTables() {
        this.syncCalls_.push(true);
        try {
            await this.syncTables_();
        }
        finally {
            this.syncCalls_.pop();
        }
    }
    async countRows() {
        const sql = 'SELECT count(*) as total FROM notes_fts';
        const row = await this.db().selectOne(sql);
        return row && row['total'] ? row['total'] : 0;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    fieldNamesFromOffsets_(offsets) {
        const notesNormalizedFieldNames = this.db().tableFieldNames('notes_normalized');
        const occurrenceCount = Math.floor(offsets.length / 4);
        const output = [];
        for (let i = 0; i < occurrenceCount; i++) {
            const colIndex = offsets[i * 4];
            const fieldName = notesNormalizedFieldNames[colIndex];
            if (!output.includes(fieldName))
                output.push(fieldName);
        }
        return output;
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
        if (rows.length === 0)
            return;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const hitsThisRow = (array, c, p) => array[3 * (c + p * numColumns) + 0];
        // const hitsAllRows = (array, c, p) => array[3 * (c + p*NUM_COLS) + 1];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const docsWithHits = (array, c, p) => array[3 * (c + p * numColumns) + 2];
        const IDF = (n, N) => Math.max(Math.log(((N - n + 0.5) / (n + 0.5)) + 1), 0);
        // https://en.wikipedia.org/wiki/Okapi_BM25
        const BM25 = (idf, freq, numTokens, avgTokens) => {
            if (avgTokens === 0) {
                return 0; // To prevent division by zero
            }
            return idf * (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (numTokens / avgTokens)));
        };
        const msSinceEpoch = Math.round(new Date().getTime());
        const msPerDay = 86400000;
        const weightForDaysSinceLastUpdate = (row) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    processBasicSearchResults_(rows, parsedQuery) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const valueRegexs = parsedQuery.keys.includes('_') ? parsedQuery.terms['_'].map((term) => term.valueRegex || term.value) : [];
        const isTitleSearch = parsedQuery.keys.includes('title');
        const isOnlyTitle = parsedQuery.keys.length === 1 && isTitleSearch;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const testTitle = (regex) => new RegExp(regex, 'ig').test(row.title);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const matchedFields = {
                title: isTitleSearch || valueRegexs.some(testTitle),
                body: !isOnlyTitle,
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            row.fields = Object.keys(matchedFields).filter((key) => matchedFields[key]);
            row.weight = 0;
            row.fuzziness = 0;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    processResults_(rows, parsedQuery, isBasicSearchResults = false) {
        if (isBasicSearchResults) {
            this.processBasicSearchResults_(rows, parsedQuery);
        }
        else {
            this.calculateWeightBM25_(rows);
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const offsets = row.offsets.split(' ').map((o) => Number(o));
                row.fields = this.fieldNamesFromOffsets_(offsets);
            }
        }
        rows.sort((a, b) => {
            const aIsNote = a.item_type === BaseModel_1.ModelType.Note;
            const bIsNote = b.item_type === BaseModel_1.ModelType.Note;
            if (a.fields.includes('title') && !b.fields.includes('title'))
                return -1;
            if (!a.fields.includes('title') && b.fields.includes('title'))
                return +1;
            if (a.weight < b.weight)
                return +1;
            if (a.weight > b.weight)
                return -1;
            if (aIsNote && bIsNote) {
                if (a.is_todo && a.todo_completed)
                    return +1;
                if (b.is_todo && b.todo_completed)
                    return -1;
            }
            if (a.user_updated_time < b.user_updated_time)
                return +1;
            if (a.user_updated_time > b.user_updated_time)
                return -1;
            return 0;
        });
    }
    // https://stackoverflow.com/a/13818704/561309
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    queryTermToRegex(term) {
        while (term.length && term.indexOf('*') === 0) {
            term = term.substr(1);
        }
        let regexString = (0, string_utils_1.pregQuote)(term);
        if (regexString[regexString.length - 1] === '*') {
            regexString = `${regexString.substr(0, regexString.length - 2)}[^${(0, string_utils_1.pregQuote)(' \t\n\r,.,+-*?!={}<>|:"\'()[]')}]` + '*?';
            // regexString = regexString.substr(0, regexString.length - 2) + '.*?';
        }
        return regexString;
    }
    async parseQuery(query) {
        const trimQuotes = (str) => str.startsWith('"') ? str.substr(1, str.length - 2) : str;
        let allTerms = [];
        try {
            allTerms = (0, filterParser_1.default)(query);
        }
        catch (error) {
            console.warn(error);
        }
        const textTerms = allTerms.filter(x => x.name === 'text' && !x.negated).map(x => trimQuotes(x.value));
        const titleTerms = allTerms.filter(x => x.name === 'title' && !x.negated).map(x => trimQuotes(x.value));
        const bodyTerms = allTerms.filter(x => x.name === 'body' && !x.negated).map(x => trimQuotes(x.value));
        const terms = { _: textTerms, 'title': titleTerms, 'body': bodyTerms };
        // Filter terms:
        // - Convert wildcards to regex
        // - Remove columns with no results
        // - Add count of terms
        let termCount = 0;
        const keys = [];
        for (const col2 in terms) {
            const col = col2;
            if (!terms.hasOwnProperty(col))
                continue;
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
                    terms[col][i] = { type: 'regex', value: term, scriptType: (0, string_utils_1.scriptType)(term), valueRegex: this.queryTermToRegex(term) };
                }
                else {
                    terms[col][i] = { type: 'text', value: term, scriptType: (0, string_utils_1.scriptType)(term) };
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
                return Object.assign(Object.assign({}, x), { value: this.normalizeText_(x.value) });
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
    allParsedQueryTerms(parsedQuery) {
        if (!parsedQuery || !parsedQuery.termCount)
            return [];
        let output = [];
        for (const col of Object.keys(parsedQuery.terms)) {
            output = output.concat(parsedQuery.terms[col]);
        }
        return output;
    }
    normalizeText_(text) {
        let normalizedText = text.normalize ? text.normalize() : text;
        // NULL characters can break FTS. Remove them.
        normalizedText = (0, replaceUnsupportedCharacters_1.default)(normalizedText);
        // We need to decode HTML entities too
        // https://github.com/laurent22/joplin/issues/9694
        normalizedText = (0, html_1.htmlentitiesDecode)(normalizedText);
        // The FTS tokenizer doesn't understand some types of space,
        // including nonbreaking spaces and CRLF.
        normalizedText = normalizedText.replace(/\s/g, ' ');
        return (0, string_utils_1.removeDiacritics)(normalizedText.toLowerCase());
    }
    normalizeNote_(note) {
        const n = Object.assign({}, note);
        try {
            n.title = this.normalizeText_(n.title);
            n.body = this.normalizeText_(n.body);
        }
        catch (error) {
            // Text normalization -- specifically removeDiacritics -- can fail in some cases.
            // We log additional information to help determine the cause of the issue.
            //
            // See https://discourse.joplinapp.org/t/search-not-working-on-ios/35754
            this.logger().error(`Error while normalizing text for note ${note.id}:`, error);
            // Unnormalized text can break the search engine, specifically NUL characters.
            // Thus, we remove the text entirely.
            n.title = '';
            n.body = '';
        }
        return n;
    }
    async basicSearch(query) {
        query = query.replace(/\*/, '');
        const parsedQuery = await this.parseQuery(query);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const searchOptions = {};
        for (const key of parsedQuery.keys) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            if (parsedQuery.terms[key].length === 0)
                continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const term = parsedQuery.terms[key].map((x) => x.value).join(' ');
            if (key === '_')
                searchOptions.anywherePattern = `*${term}*`;
            if (key === 'title')
                searchOptions.titlePattern = `*${term}*`;
            if (key === 'body')
                searchOptions.bodyPattern = `*${term}*`;
        }
        return Note_1.default.previews(null, searchOptions);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    determineSearchType_(query, preferredSearchType) {
        if (preferredSearchType === SearchEngine.SEARCH_TYPE_BASIC)
            return SearchEngine.SEARCH_TYPE_BASIC;
        if (preferredSearchType === SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT)
            return SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT;
        // If preferredSearchType is "fts" we auto-detect anyway
        // because it's not always supported.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let allTerms = [];
        try {
            allTerms = (0, filterParser_1.default)(query);
        }
        catch (error) {
            console.warn(error);
        }
        const textQuery = allTerms.filter(x => x.name === 'text' || x.name === 'title' || x.name === 'body').map(x => x.value).join(' ');
        const st = (0, string_utils_1.scriptType)(textQuery);
        if (!Setting_1.default.value('db.ftsEnabled')) {
            return SearchEngine.SEARCH_TYPE_BASIC;
        }
        // Non-alphabetical languages aren't support by SQLite FTS (except with extensions which are not available in all platforms)
        if (['ja', 'zh', 'ko', 'th'].indexOf(st) >= 0) {
            return SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT;
        }
        return SearchEngine.SEARCH_TYPE_FTS;
    }
    async searchFromItemIds(searchString) {
        let itemId = '';
        if ((0, callbackUrlUtils_1.isCallbackUrl)(searchString)) {
            const parsed = (0, callbackUrlUtils_1.parseCallbackUrl)(searchString);
            itemId = parsed.params.id;
        }
        // Disabled for now:
        // https://github.com/laurent22/joplin/issues/9769#issuecomment-1912459744
        // else if (isItemId(searchString)) {
        // 	itemId = searchString;
        // }
        if (itemId) {
            const item = await BaseItem_1.default.loadItemById(itemId);
            // We only return notes for now because the UI doesn't handle anything else.
            if (item && item.type_ === BaseModel_1.ModelType.Note) {
                return [
                    {
                        id: item.id,
                        item_id: item.id,
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
    async search(searchString, options = null) {
        var _a, _b;
        if (!searchString)
            return [];
        options = Object.assign({ searchType: SearchEngine.SEARCH_TYPE_AUTO, appendWildCards: false, includeOrphanedResources: false }, options);
        const searchType = this.determineSearchType_(searchString, options.searchType);
        const parsedQuery = await this.parseQuery(searchString);
        let rows = [];
        if (searchType === SearchEngine.SEARCH_TYPE_BASIC) {
            searchString = this.normalizeText_(searchString);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            rows = (await this.basicSearch(searchString));
            this.processResults_(rows, parsedQuery, true);
        }
        else {
            // SEARCH_TYPE_FTS
            // FTS will ignore all special characters, like "-" in the index. So if
            // we search for "this-phrase" it won't find it because it will only
            // see "this phrase" in the index. Because of this, we remove the dashes
            // when searching.
            // https://github.com/laurent22/joplin/issues/1075#issuecomment-459258856
            if (options.appendWildCards) {
                parsedQuery.allTerms = parsedQuery.allTerms.map(t => {
                    if (t.name === 'text' && !t.wildcard) {
                        t = Object.assign(Object.assign({}, t), { wildcard: true, value: t.value.endsWith('"') ? `${t.value.substring(0, t.value.length - 1)}*"` : `${t.value}*` });
                    }
                    return t;
                });
            }
            const useFts = searchType === SearchEngine.SEARCH_TYPE_FTS;
            try {
                const { query, params } = (0, queryBuilder_1.default)(parsedQuery.allTerms, useFts);
                rows = await this.db().selectAll(query, params);
                const queryHasFilters = !!parsedQuery.allTerms.find(t => t.name !== 'text');
                rows = rows.map(r => {
                    return Object.assign(Object.assign({}, r), { item_type: BaseModel_1.ModelType.Note });
                });
                if (!queryHasFilters && Setting_1.default.value('ocr.searchInExtractedContent')) {
                    const toSearch = parsedQuery.allTerms.map(t => t.value).join(' ');
                    let itemRows = [];
                    try {
                        itemRows = await this.db().selectAll(`
							SELECT
								id,
								title,
								user_updated_time,
								offsets(items_fts) AS offsets,
								matchinfo(items_fts, 'pcnalx') AS matchinfo,
								item_id,
								item_type
							FROM items_fts
							WHERE title MATCH ? OR body MATCH ?
						`, [toSearch, toSearch]);
                    }
                    catch (error) {
                        // Android <= 25 doesn't support the following syntax:
                        //    WHERE title MATCH ? OR body MATCH ?
                        // Thus, we skip resource search on these devices.
                        if (!((_b = (_a = error.message) === null || _a === void 0 ? void 0 : _a.includes) === null || _b === void 0 ? void 0 : _b.call(_a, 'unable to use function MATCH in the requested context'))) {
                            throw error;
                        }
                    }
                    const resourcesToNotes = await NoteResource_1.default.associatedResourceNotes(itemRows.map(r => r.item_id), {
                        fields: ['note_id', 'parent_id', 'deleted_time'],
                    });
                    const deletedNoteIds = [];
                    for (const itemRow of itemRows) {
                        const notes = resourcesToNotes[itemRow.item_id];
                        const note = notes && notes.length ? notes[0] : null;
                        if (note && note.deleted_time)
                            deletedNoteIds.push(note.note_id);
                        itemRow.id = note ? note.note_id : null;
                        itemRow.parent_id = note ? note.parent_id : null;
                    }
                    if (!options.includeOrphanedResources)
                        itemRows = itemRows.filter(r => !!r.id);
                    itemRows = itemRows.filter(r => !deletedNoteIds.includes(r.id));
                    rows = rows.concat(itemRows);
                }
                this.processResults_(rows, parsedQuery, !useFts);
            }
            catch (error) {
                this.logger().warn(`Cannot execute MATCH query: ${searchString}: ${error.message}`);
                rows = [];
            }
        }
        if (!rows.length) {
            rows = await this.searchFromItemIds(searchString);
        }
        return rows;
    }
    async destroy() {
        if (this.scheduleSyncTablesIID_) {
            shim_1.default.clearTimeout(this.scheduleSyncTablesIID_);
            this.scheduleSyncTablesIID_ = null;
        }
        SearchEngine.instance_ = null;
        return new Promise((resolve) => {
            const iid = shim_1.default.setInterval(() => {
                if (!this.syncCalls_.length) {
                    shim_1.default.clearInterval(iid);
                    SearchEngine.instance_ = null;
                    resolve(null);
                }
            }, 100);
        });
    }
}
SearchEngine.instance_ = null;
SearchEngine.relevantFields = 'id, title, body, user_created_time, user_updated_time, is_todo, todo_completed, todo_due, parent_id, latitude, longitude, altitude, source_url';
SearchEngine.SEARCH_TYPE_AUTO = SearchType.Auto;
SearchEngine.SEARCH_TYPE_BASIC = SearchType.Basic;
SearchEngine.SEARCH_TYPE_NONLATIN_SCRIPT = SearchType.Nonlatin;
SearchEngine.SEARCH_TYPE_FTS = SearchType.Fts;
exports.default = SearchEngine;
