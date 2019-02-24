const SearchEngine = require('lib/services/SearchEngine');
const Note = require('lib/models/Note');

class SearchEngineUtils {

	static async notesForQuery(query, options = null) {
		if (!options) options = {};

		const results = await SearchEngine.instance().search(query);
		const noteIds = results.map(n => n.id);

		const previewOptions = Object.assign({}, {
			order: [],
			fields: Note.previewFields(),
			conditions: ['id IN ("' + noteIds.join('","') + '")'],
		}, options);

		const notes = await Note.previews(null, previewOptions);

		// By default, the notes will be returned in reverse order
		// or maybe random order so sort them here in the correct order
		// (search engine returns the results in order of relevance).
		const sortedNotes = [];
		for (let i = 0; i < notes.length; i++) {
			const idx = noteIds.indexOf(notes[i].id);
			sortedNotes[idx] = notes[i];
		}

		return sortedNotes;
	}

}

module.exports = SearchEngineUtils;