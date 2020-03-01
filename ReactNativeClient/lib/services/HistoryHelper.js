function getLastSeenNote(selectedNoteIds, notes) {
	if ((typeof selectedNoteIds != 'undefined') && selectedNoteIds.length>0) {
		const currNote = notes.find(note => note.id === selectedNoteIds[0]);
		if (typeof currNote != 'undefined') {
			return {
				id: currNote.id,
				parent_id: currNote.parent_id,
			};
		} else return undefined;
	} else return undefined;
}

module.exports = { getLastSeenNote };
