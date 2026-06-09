import Note from '@joplin/lib/models/Note';
import { _ } from '@joplin/lib/locale';
import { NoteEntity } from '@joplin/lib/services/database/types';
const TextWidget = require('tkwidgets/TextWidget.js');

class NoteWidget extends TextWidget {
	private noteId_: string | 0;
	private note_: NoteEntity | null;
	private notes_: NoteEntity[];
	private lastLoadedNoteId_: string | null;

	public constructor() {
		super();
		this.noteId_ = 0;
		this.note_ = null;
		this.notes_ = [];
		this.lastLoadedNoteId_ = null;
	}

	public get notes() {
		return this.notes_;
	}

	public set notes(v: NoteEntity[]) {
		// If the note collection has changed it means the current note might
		// have changed or has been deleted, so refresh the note.
		this.notes_ = v;
		this.reloadNote();
	}

	public get noteId() {
		return this.noteId_;
	}

	public set noteId(v: string | 0) {
		this.noteId_ = v;
		this.note_ = null;
		this.reloadNote();
	}

	public welcomeText() {
		return _('Welcome to Joplin!\n\nType `:help shortcuts` for the list of keyboard shortcuts, or just `:help` for usage information.\n\nFor example, to create a notebook press `mb`; to create a note press `mn`.');
	}

	public reloadNote() {
		if (!this.noteId_ && !this.notes.length) {
			this.text = this.welcomeText();
			this.scrollTop = 0;
		} else if (this.noteId_) {
			this.doAsync('loadNote', async () => {
				// The outer `else if (this.noteId_)` proves noteId_ is a string,
				// but the async-closure boundary loses TS's narrowing.
				this.note_ = await Note.load(this.noteId_ as string);

				if (this.note_ && this.note_.encryption_applied) {
					this.text = _('One or more items are currently encrypted and you may need to supply a master password. To do so please type `e2ee decrypt`. If you have already supplied the password, the encrypted items are being decrypted in the background and will be available soon.');
					this.text += '\n\n';
					this.text += _('You may also type `status` for more information.');
				} else {
					this.text = this.note_ ? `${this.note_.title}\n\n${this.note_.body}` : '';
				}

				if (this.lastLoadedNoteId_ !== this.noteId_) this.scrollTop = 0;
				this.lastLoadedNoteId_ = this.noteId_ as string;
			});
		} else {
			this.text = '';
			this.scrollTop = 0;
		}
	}
}

export default NoteWidget;
