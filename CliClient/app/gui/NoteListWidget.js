const Note = require('lib/models/note.js').Note;
const ListWidget = require('tkwidgets/ListWidget.js');

class NoteListWidget extends ListWidget {

	constructor() {
		super();
		this.selectedNoteId_ = 0;
		this.setItemRenderer((item) => {
			return item.title;
		});
	}

	get selectedNoteId() {
		return this.selectedNoteId_;
	}

	set selectedNoteId(v) {
		if (v === this.selectedNoteId_) return;
		this.selectedNoteId_ = v;
		const index = this.itemIndexByKey('id', this.selectedNoteId_);
		this.currentIndex = index >= 0 ? index : 0;
	}

}

module.exports = NoteListWidget;