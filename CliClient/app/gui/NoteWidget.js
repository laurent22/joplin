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
		if (v === this.noteId_) return;
		this.noteId_ = v;
		this.note_ = null;
		this.invalidate();
	}

	async willRender() {
		if (!this.note_ && this.noteId_) {
			this.note_ = await Note.load(this.noteId_);
			this.text = this.note_.title + "\n\n" + this.note_.body;
		}
	}

}

module.exports = NoteWidget;