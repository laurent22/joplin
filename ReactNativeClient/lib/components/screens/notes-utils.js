import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
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

	static async openDefaultNoteList() {
		const selectedFolder = await Folder.defaultFolder();
		if (selectedFolder) {
			this.openNoteList(selectedFolder.id);
		} else {
			this.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'Welcome',
			});
		}
	}

}

export { NotesScreenUtils }