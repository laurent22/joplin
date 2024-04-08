/* eslint-disable multiline-comment-style */

import Plugin from '../Plugin';
import { ModelType } from '../../../BaseModel';
import eventManager, { EventName } from '../../../eventManager';
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

interface NoteContentChangeEvent {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- No plugin-api-accessible Note type defined.
	note: any;
}

interface NoteSelectionChangeEvent {
	value: string[];
}

interface NoteAlarmTriggerEvent {
	noteId: string;
}

interface SyncCompleteEvent {
	withErrors: boolean;
}

type WorkspaceEventHandler<EventType> = (event: EventType)=> void;

type ItemChangeHandler = WorkspaceEventHandler<ItemChangeEvent>;
type SyncStartHandler = WorkspaceEventHandler<SyncStartEvent>;
type ResourceChangeHandler = WorkspaceEventHandler<ResourceChangeEvent>;

/**
 * The workspace service provides access to all the parts of Joplin that
 * are being worked on - i.e. the currently selected notes or notebooks as
 * well as various related events, such as when a new note is selected, or
 * when the note content changes.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
 */
export default class JoplinWorkspace {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store: any;
	private plugin: Plugin;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	/**
	 * Called when a new note or notes are selected.
	 */
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public async onNoteSelectionChange(callback: WorkspaceEventHandler<NoteSelectionChangeEvent>): Promise<Disposable> {
		eventManager.appStateOn('selectedNoteIds', callback);
		const dispose = () => {
			eventManager.appStateOff('selectedNoteIds', callback);
		};
		this.plugin.addOnUnloadListener(dispose);

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
	public async onNoteContentChange(callback: WorkspaceEventHandler<NoteContentChangeEvent>) {
		eventManager.on(EventName.NoteContentChange, callback);
		const dispose = () => {
			eventManager.off(EventName.NoteContentChange, callback);
		};
		this.plugin.addOnUnloadListener(dispose);
	}

	/**
	 * Called when the content of the current note changes.
	 */
	public async onNoteChange(handler: ItemChangeHandler): Promise<Disposable> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const wrapperHandler = (event: any) => {
			if (event.itemType !== ModelType.Note) return;
			if (!this.store.getState().selectedNoteIds.includes(event.itemId)) return;

			handler({
				id: event.itemId,
				event: event.eventType,
			});
		};

		return makeListener(this.plugin, eventManager, EventName.ItemChange, wrapperHandler);
	}

	/**
	 * Called when a resource is changed. Currently this handled will not be
	 * called when a resource is added or deleted.
	 */
	public async onResourceChange(handler: ResourceChangeHandler): Promise<void> {
		makeListener(this.plugin, eventManager, EventName.ResourceChange, handler);
	}

	/**
	 * Called when an alarm associated with a to-do is triggered.
	 */
	public async onNoteAlarmTrigger(handler: WorkspaceEventHandler<NoteAlarmTriggerEvent>): Promise<Disposable> {
		return makeListener(this.plugin, eventManager, EventName.NoteAlarmTrigger, handler);
	}

	/**
	 * Called when the synchronisation process is starting.
	 */
	public async onSyncStart(handler: SyncStartHandler): Promise<Disposable> {
		return makeListener(this.plugin, eventManager, EventName.SyncStart, handler);
	}

	/**
	 * Called when the synchronisation process has finished.
	 */
	public async onSyncComplete(callback: WorkspaceEventHandler<SyncCompleteEvent>): Promise<Disposable> {
		return makeListener(this.plugin, eventManager, EventName.SyncComplete, callback);
	}

	/**
	 * Called just before the editor context menu is about to open. Allows
	 * adding items to it.
	 *
	 * <span class="platform-desktop">desktop</span>
	 */
	public filterEditorContextMenu(handler: FilterHandler<EditContextMenuFilterObject>) {
		eventManager.filterOn('editorContextMenu', handler);
		this.plugin.addOnUnloadListener(() => {
			eventManager.filterOff('editorContextMenu', handler);
		});
	}

	/**
	 * Gets the currently selected note. Will be `null` if no note is selected.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
