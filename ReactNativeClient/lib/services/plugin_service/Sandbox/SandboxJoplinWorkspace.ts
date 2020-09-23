import eventManager from 'lib/eventManager';
const Note = require('lib/models/Note');

export default class SandboxJoplinWorkspace {
	// TODO: unregister events when plugin is closed or disabled

	private store: any;

	constructor(store: any) {
		this.store = store;
	}

	onNoteSelectionChange(callback: Function) {
		eventManager.appStateOn('selectedNoteIds', callback);
	}

	onNoteContentChange(callback: Function) {
		eventManager.on('noteContentChange', callback);
	}


	async selectedNote() {
		const noteIds = this.store.getState().selectedNoteIds;
		if (noteIds.length !== 1) { return null; }
		return Note.load(noteIds[0]);
	}
}
