import eventManager from 'lib/eventManager';
const Note = require('lib/models/Note');

export interface EditorCommand {
	name: string;
	value: any;
}

export default class JoplinWorkspace {
	// TODO: unregister events when plugin is closed or disabled

	private store: any;
	private implementation_:any;

	constructor(implementation:any, store: any) {
		this.store = store;
		this.implementation_ = implementation;
	}

	async onNoteSelectionChange(callback: Function) {
		eventManager.appStateOn('selectedNoteIds', callback);
	}

	async onNoteContentChange(callback: Function) {
		eventManager.on('noteContentChange', callback);
	}

	async onNoteAlarmTrigger(callback:Function) {
		eventManager.on('noteAlarmTrigger', callback);
	}

	async onSyncComplete(callback:Function) {
		eventManager.on('syncComplete', callback);
	}

	async selectedNote() {
		const noteIds = this.store.getState().selectedNoteIds;
		if (noteIds.length !== 1) { return null; }
		return Note.load(noteIds[0]);
	}

	async selectedNoteIds() {
		return this.store.getState().selectedNoteIds.slice();
	}

	// TODO: all these should be accessible via the commands namespace
	async execEditorCommand(command:EditorCommand) {
		return this.implementation_.execEditorCommand(command);
	}
}
