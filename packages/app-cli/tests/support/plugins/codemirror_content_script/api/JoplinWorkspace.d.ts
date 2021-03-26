import { FolderEntity } from '../../database/types';
import { Disposable } from './types';
declare enum ItemChangeEventType {
    Create = 1,
    Update = 2,
    Delete = 3,
}
interface ItemChangeEvent {
    id: string;
    event: ItemChangeEventType;
}
interface SyncStartEvent {
    withErrors: boolean;
}
declare type ItemChangeHandler = (event: ItemChangeEvent)=> void;
declare type SyncStartHandler = (event: SyncStartEvent)=> void;
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
    constructor(store: any);
    /**
     * Called when a new note or notes are selected.
     */
    onNoteSelectionChange(callback: Function): Promise<Disposable>;
    /**
     * Called when the content of a note changes.
     * @deprecated Use `onNoteChange()` instead, which is reliably triggered whenever the note content, or any note property changes.
     */
    onNoteContentChange(callback: Function): Promise<void>;
    /**
     * Called when the content of a note changes.
     */
    onNoteChange(handler: ItemChangeHandler): Promise<Disposable>;
    /**
     * Called when an alarm associated with a to-do is triggered.
     */
    onNoteAlarmTrigger(handler: Function): Promise<Disposable>;
    /**
     * Called when the synchronisation process is starting.
     */
    onSyncStart(handler: SyncStartHandler): Promise<Disposable>;
    /**
     * Called when the synchronisation process has finished.
     */
    onSyncComplete(callback: Function): Promise<Disposable>;
    /**
     * Gets the currently selected note
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
