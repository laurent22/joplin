import SearchEngineUtils from '@joplin/lib/services/searchengine/SearchEngineUtils';
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';

// Returns notes from a search query and sets highlighted words
// Be sure to use 'await' keyword or the function might not work properly
// Eg. await HandleNoteQuery();

const searchNotes = async (query: string, dbFtsEnabled: boolean, dispatch: (action: Object)=> void): Promise<NoteEntity[]> => {
	let notes = [];

	if (query) {
		if (dbFtsEnabled) {
			notes = await SearchEngineUtils.notesForQuery(query, true);
		} else {
			const p = query.split(' ');
			const temp = [];
			for (let i = 0; i < p.length; i++) {
				const t = p[i].trim();
				if (!t) continue;
				temp.push(t);
			}

			notes = await Note.previews(null, {
				anywherePattern: `*${temp.join('*')}*`,
			});
		}

		const parsedQuery = await SearchEngine.instance().parseQuery(query);
		const highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);

		dispatch({
			type: 'SET_HIGHLIGHTED',
			words: highlightedWords,
		});
	}

	return notes;
};

export default searchNotes;
