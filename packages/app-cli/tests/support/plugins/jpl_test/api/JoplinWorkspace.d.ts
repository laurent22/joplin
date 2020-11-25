/**
 * The workspace service provides access to all the parts of Joplin that are being worked on - i.e. the currently selected notes or notebooks as well
 * as various related events, such as when a new note is selected, or when the note content changes.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
 */
export default class JoplinWorkspace {
    private store;
    constructor(_implementation: any, store: any);
    /**
     * Called when a new note or notes are selected.
     */
    onNoteSelectionChange(callback: Function): Promise<void>;
    /**
     * Called when the content of a note changes.
     */
    onNoteContentChange(callback: Function): Promise<void>;
    /**
     * Called when an alarm associated with a to-do is triggered.
     */
    onNoteAlarmTrigger(callback: Function): Promise<void>;
    /**
     * Called when the synchronisation process has finished.
     */
    onSyncComplete(callback: Function): Promise<void>;
    /**
     * Gets the currently selected note
     */
    selectedNote(): Promise<any>;
    /**
     * Gets the IDs of the selected notes (can be zero, one, or many). Use the data API to retrieve information about these notes.
     */
    selectedNoteIds(): Promise<string[]>;
}
