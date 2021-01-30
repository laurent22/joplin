const Note = require('@joplin/lib/models/Note').default;
const TextWidget = require('tkwidgets/TextWidget.js');

class NoteMetadataWidget extends TextWidget {
	constructor() {
		super();
		this.noteId_ = 0;
		this.note_ = null;
	}

	get noteId() {
		return this.noteId_;
	}

	set noteId(v) {
		// If this is called it means either the note ID has changed OR
		// the note content has changed, so we always set note_ to null
		// so that it can be reloaded in onWillRender().
		this.noteId_ = v;
		this.note_ = null;
		this.invalidate();
	}

	async onWillRender() {
		if (!this.visible) return;

		if (!this.note_ && this.noteId_) {
			this.note_ = await Note.load(this.noteId_);
			this.text = this.note_ ? await Note.minimalSerializeForDisplay(this.note_) : '';
		}
	}
}

module.exports = NoteMetadataWidget;
