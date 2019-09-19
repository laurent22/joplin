const SearchEngine = require('lib/services/SearchEngine');
const Note = require('lib/models/Note');

class SearchEngineUtils {
	static async notesForQuery(query, options = null) {
		if (!options) options = {};

		const results = await SearchEngine.instance().search(query);
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

		const previewOptions = Object.assign(
			{},
			{
				order: [],
				fields: fields,
				conditions: [`id IN ("${noteIds.join('","')}")`],
			},
			options
		);

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

		return sortedNotes;
	}
}

module.exports = SearchEngineUtils;
