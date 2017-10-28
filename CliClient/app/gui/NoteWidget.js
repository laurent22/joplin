const Note = require('lib/models/note.js').Note;
const TextWidget = require('tkwidgets/TextWidget.js');

class NoteWidget extends TextWidget {

	constructor() {
		super();
		this.noteId_ = 0;
		this.note_ = null;
	}

	get noteId() {
		return this.noteId_;
	}

	set noteId(v) {
		this.noteId_ = v;
		this.note_ = null;

		if (this.noteId_) {
			this.doAsync('loadNote', async () => {
				this.note_ = await Note.load(this.noteId_);
				this.text = this.note_ ? this.note_.title + "\n\n" + this.note_.body : '';
			});
		} else {
			this.text = '';
		}
	}

}

module.exports = NoteWidget;