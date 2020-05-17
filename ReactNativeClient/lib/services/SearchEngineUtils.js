const SearchEngine = require('lib/services/SearchEngine');
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
		let sortedNotes = [];
		for (let i = 0; i < notes.length; i++) {
			const idx = noteIds.indexOf(notes[i].id);
			sortedNotes[idx] = notes[i];
			if (idWasAutoAdded) delete sortedNotes[idx].id;
		}
		sortedNotes = sortedNotes.filter(function(a) { return a != null; });

		return sortedNotes;
	}
}

module.exports = SearchEngineUtils;
