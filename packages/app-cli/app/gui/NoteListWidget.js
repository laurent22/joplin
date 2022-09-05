const Note = require('@joplin/lib/models/Note').default;
const ListWidget = require('tkwidgets/ListWidget.js');

class NoteListWidget extends ListWidget {
	constructor() {
		super();
		this.selectedNoteId_ = 0;
		this.showIds = false;

		this.updateIndexFromSelectedNoteId_ = false;

		this.itemRenderer = note => {
			let label = Note.displayTitle(note);
			if (this.showIds) {
				label = `${Note.shortId(note.id)} ${Note.displayTitle(note)}`;
			}
			if (note.is_todo) {
				label = `[${note.todo_completed ? 'X' : ' '}] ${label}`;
			}
			return label;
		};
	}

	set selectedNoteId(v) {
		this.updateIndexFromSelectedNoteId_ = true;
		this.selectedNoteId_ = v;
	}

	toggleShowIds() {
		this.showIds = !this.showIds;
		this.invalidate();
	}

	render() {
		if (this.updateIndexFromSelectedNoteId_) {
			const index = this.itemIndexByKey('id', this.selectedNoteId_);
			this.currentIndex = index >= 0 ? index : 0;
			this.updateIndexFromSelectedNoteId_ = false;
		}

		super.render();
	}
}

module.exports = NoteListWidget;
