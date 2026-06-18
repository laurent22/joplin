import Plugin from '../Plugin';
import { FolderEntity } from '../../database/types';
import { Disposable, EditContextMenuFilterObject, FilterHandler } from './types';
declare enum ItemChangeEventType {
    Create = 1,
    Update = 2,
    Delete = 3
}
interface ItemChangeEvent {
    id: string;
    event: ItemChangeEventType;
}
interface ResourceChangeEvent {
    id: string;
}
interface NoteContentChangeEvent {
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
type WorkspaceEventHandler<EventType> = (event: EventType) => void;
type ItemChangeHandler = WorkspaceEventHandler<ItemChangeEvent>;
type SyncStartHandler = () => void;
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
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    /**
     * Called when a new note or notes are selected.
     */
    onNoteSelectionChange(callback: WorkspaceEventHandler<NoteSelectionChangeEvent>): Promise<Disposable>;
    /**
     * Called when the content of a note changes.
     * @deprecated Use `onNoteChange()` instead, which is reliably triggered whenever the note content, or any note property changes.
     */
    onNoteContentChange(callback: WorkspaceEventHandler<NoteContentChangeEvent>): Promise<void>;
    /**
     * Called when the content of the current note changes.
     */
    onNoteChange(handler: ItemChangeHandler): Promise<Disposable>;
    /**
     * Called when a resource is changed. Currently this handled will not be
     * called when a resource is added or deleted.
     */
    onResourceChange(handler: ResourceChangeHandler): Promise<void>;
    /**
     * Called when an alarm associated with a to-do is triggered.
     */
    onNoteAlarmTrigger(handler: WorkspaceEventHandler<NoteAlarmTriggerEvent>): Promise<Disposable>;
    /**
     * Called when the synchronisation process is starting.
     */
    onSyncStart(handler: SyncStartHandler): Promise<Disposable>;
    /**
     * Called when the synchronisation process has finished.
     */
    onSyncComplete(callback: WorkspaceEventHandler<SyncCompleteEvent>): Promise<Disposable>;
    /**
     * Called just before the editor context menu is about to open. Allows
     * adding items to it.
     *
     * <span class="platform-desktop">desktop</span>
     */
    filterEditorContextMenu(handler: FilterHandler<EditContextMenuFilterObject>): void;
    /**
     * Gets the currently selected note. Will be `null` if no note is selected.
     */
    selectedNote(): Promise<any>;
    /**
     * Gets the currently selected folder. In some cases, for example during
     * search or when viewing a tag, no folder is actually selected in the user
     * interface. In that case, that function would return the last selected
     * folder.
     */
    selectedFolder(): Promise<FolderEntity>;
    /**
     * Gets the IDs of the selected notes (can be zero, one, or many). Use the data API to retrieve information about these notes.
     */
    selectedNoteIds(): Promise<string[]>;
}
export {};
