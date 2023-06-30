/* eslint-disable multiline-comment-style */

import { ModelType } from '../../../BaseModel';
import eventManager from '../../../eventManager';
import Setting from '../../../models/Setting';
import { FolderEntity } from '../../database/types';
import makeListener from '../utils/makeListener';
import { Disposable, MenuItem } from './types';

/**
 * @ignore
 */
import Note from '../../../models/Note';

/**
 * @ignore
 */
import Folder from '../../../models/Folder';

export interface EditContextMenuFilterObject {
	items: MenuItem[];
}

type FilterHandler<T> = (object: T)=> Promise<void>;

enum ItemChangeEventType {
	Create = 1,
	Update = 2,
	Delete = 3,
}

interface ItemChangeEvent {
	id: string;
	event: ItemChangeEventType;
}

interface SyncStartEvent {
	// Tells whether there were errors during sync or not. The log will
	// have the complete information about any error.
	withErrors: boolean;
}

interface ResourceChangeEvent {
	id: string;
}

type ItemChangeHandler = (event: ItemChangeEvent)=> void;
type SyncStartHandler = (event: SyncStartEvent)=> void;
type ResourceChangeHandler = (event: ResourceChangeEvent)=> void;

/**
 * The workspace service provides access to all the parts of Joplin that
 * are being worked on - i.e. the currently selected notes or notebooks as
 * well as various related events, such as when a new note is selected, or
 * when the note content changes.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
 */
export default class JoplinWorkspace {
	// TODO: unregister events when plugin is closed or disabled

	private store: any;

	public constructor(store: any) {
		this.store = store;
	}

	/**
	 * Called when a new note or notes are selected.
	 */
	public async onNoteSelectionChange(callback: Function): Promise<Disposable> {
		eventManager.appStateOn('selectedNoteIds', callback);

		return {};

		// return {
		// 	dispose: () => {
		// 		eventManager.appStateOff('selectedNoteIds', callback);
		// 	}
		// };
	}

	/**
	 * Called when the content of a note changes.
	 * @deprecated Use `onNoteChange()` instead, which is reliably triggered whenever the note content, or any note property changes.
	 */
	public async onNoteContentChange(callback: Function) {
		eventManager.on('noteContentChange', callback);
	}

	/**
	 * Called when the content of the current note changes.
	 */
	public async onNoteChange(handler: ItemChangeHandler): Promise<Disposable> {
		const wrapperHandler = (event: any) => {
			if (event.itemType !== ModelType.Note) return;
			if (!this.store.getState().selectedNoteIds.includes(event.itemId)) return;

			handler({
				id: event.itemId,
				event: event.eventType,
			});
		};

		return makeListener(eventManager, 'itemChange', wrapperHandler);
	}

	/**
	 * Called when a resource is changed. Currently this handled will not be
	 * called when a resource is added or deleted.
	 */
	public async onResourceChange(handler: ResourceChangeHandler): Promise<void> {
		makeListener(eventManager, 'resourceChange', handler);
	}

	/**
	 * Called when an alarm associated with a to-do is triggered.
	 */
	public async onNoteAlarmTrigger(handler: Function): Promise<Disposable> {
		return makeListener(eventManager, 'noteAlarmTrigger', handler);
	}

	/**
	 * Called when the synchronisation process is starting.
	 */
	public async onSyncStart(handler: SyncStartHandler): Promise<Disposable> {
		return makeListener(eventManager, 'syncStart', handler);
	}

	/**
	 * Called when the synchronisation process has finished.
	 */
	public async onSyncComplete(callback: Function): Promise<Disposable> {
		return makeListener(eventManager, 'syncComplete', callback);
	}

	/**
	 * Called just before the editor context menu is about to open. Allows
	 * adding items to it.
	 */
	public filterEditorContextMenu(handler: FilterHandler<EditContextMenuFilterObject>) {
		eventManager.filterOn('editorContextMenu', handler);
	}

	/**
	 * Gets the currently selected note
	 */
	public async selectedNote(): Promise<any> {
		const noteIds = this.store.getState().selectedNoteIds;
		if (noteIds.length !== 1) { return null; }
		return Note.load(noteIds[0]);
	}

	/**
	 * Gets the currently selected folder. In some cases, for example during
	 * search or when viewing a tag, no folder is actually selected in the user
	 * interface. In that case, that function would return the last selected
	 * folder.
	 */
	public async selectedFolder(): Promise<FolderEntity> {
		const folderId = Setting.value('activeFolderId');
		return folderId ? await Folder.load(folderId) : null;
	}

	/**
	 * Gets the IDs of the selected notes (can be zero, one, or many). Use the data API to retrieve information about these notes.
	 */
	public async selectedNoteIds(): Promise<string[]> {
		return this.store.getState().selectedNoteIds.slice();
	}

}
