const SearchEngine = require('lib/services/searchengine/SearchEngine');
const Note = require('lib/models/Note');

class SearchEngineUtils {
	static async notesForQuery(query, options = null) {
		if (!options) options = {};

		let searchType = SearchEngine.SEARCH_TYPE_FTS;
		if (query.length && query[0] === '/') {
			query = query.substr(1);
			searchType = SearchEngine.SEARCH_TYPE_BASIC;
		}

		const results = await SearchEngine.instance().search(query, { searchType });
		const noteIds = results.map(n => n.id);

		// We need at least the note ID to be able to sort them below so if not
		// present in field list, add it.L Also remember it was auto-added so that
		// it can be removed afterwards.
		let idWasAutoAdded = false;
		const fields = options.fields ? options.fields : Note.previewFields().slice();
		if (fields.indexOf('id') < 0) {
			fields.push('id');
			idWasAutoAdded = true;
		}

		const previewOptions = Object.assign({}, {
			order: [],
			fields: fields,
			conditions: [`id IN ("${noteIds.join('","')}")`],
		}, options);

		const notes = await Note.previews(null, previewOptions);

		// By default, the notes will be returned in reverse order
		// or maybe random order so sort them here in the correct order
		// (search engine returns the results in order of relevance).
		const sortedNotes = [];
		for (let i = 0; i < notes.length; i++) {
			const idx = noteIds.indexOf(notes[i].id);
			sortedNotes[idx] = notes[i];
			if (idWasAutoAdded) delete sortedNotes[idx].id;
		}


		// Note that when the search engine index is somehow corrupted, it might contain
		// references to notes that don't exist. Not clear how it can happen, but anyway
		// handle it here by checking if `user_updated_time` IS NOT NULL. Was causing this
		// issue: https://discourse.joplinapp.org/t/how-to-recover-corrupted-database/9367
		if (noteIds.length !== notes.length) {
			// remove null objects
			return sortedNotes.filter(n => n);
		} else {
			return sortedNotes;
		}

	}
}

module.exports = SearchEngineUtils;
