import { Note } from 'lib/models/note.js'
import { Log } from 'lib/log.js'

class NotesScreenUtils {

	static openNoteList(folderId) {
		return Note.previews(folderId).then((notes) => {
			this.dispatch({
				type: 'NOTES_UPDATE_ALL',
				notes: notes,
			});

			this.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'Notes',
				folderId: folderId,
			});
		}).catch((error) => {
			Log.warn('Cannot load notes from ' + folderId, error);
		});
	}

}

export { NotesScreenUtils }