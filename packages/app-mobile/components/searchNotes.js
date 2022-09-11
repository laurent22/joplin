'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const SearchEngineUtils_1 = require('@joplin/lib/services/searchengine/SearchEngineUtils');
const SearchEngine_1 = require('@joplin/lib/services/searchengine/SearchEngine');
const Note_1 = require('@joplin/lib/models/Note');
// Returns notes from a search query and sets highlighted words
// Be sure to use 'await' keyword or the function might not work properly
// Eg. await HandleNoteQuery();
const searchNotes = (query, dbFtsEnabled, dispatch) => __awaiter(void 0, void 0, void 0, function* () {
	let notes = [];
	if (query) {
		if (dbFtsEnabled) {
			notes = yield SearchEngineUtils_1.default.notesForQuery(query, true);
		} else {
			const p = query.split(' ');
			const temp = [];
			for (let i = 0; i < p.length; i++) {
				const t = p[i].trim();
				if (!t) { continue; }
				temp.push(t);
			}
			notes = yield Note_1.default.previews(null, {
				anywherePattern: `*${temp.join('*')}*`,
			});
		}
		const parsedQuery = yield SearchEngine_1.default.instance().parseQuery(query);
		const highlightedWords = SearchEngine_1.default.instance().allParsedQueryTerms(parsedQuery);
		dispatch({
			type: 'SET_HIGHLIGHTED',
			words: highlightedWords,
		});
	}
	return notes;
});
exports.default = searchNotes;
// # sourceMappingURL=searchNotes.js.map
