import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
const ListWidget = require('tkwidgets/ListWidget.js');

class NoteListWidget extends ListWidget {
	private selectedNoteId_: string | 0;
	public showIds: boolean;
	private updateIndexFromSelectedNoteId_: boolean;

	public constructor() {
		super();
		this.selectedNoteId_ = 0;
		this.showIds = false;

		this.updateIndexFromSelectedNoteId_ = false;

		this.itemRenderer = (note: NoteEntity) => {
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

	public set selectedNoteId(v: string | 0) {
		this.updateIndexFromSelectedNoteId_ = true;
		this.selectedNoteId_ = v;
	}

	public toggleShowIds() {
		this.showIds = !this.showIds;
		this.invalidate();
	}

	public render() {
		if (this.updateIndexFromSelectedNoteId_) {
			const index = this.itemIndexByKey('id', this.selectedNoteId_);
			this.currentIndex = index >= 0 ? index : 0;
			this.updateIndexFromSelectedNoteId_ = false;
		}

		super.render();
	}
}

export default NoteListWidget;
