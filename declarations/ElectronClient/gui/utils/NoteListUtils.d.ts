import { PluginStates } from 'lib/services/plugins/reducer';
interface ContextMenuProps {
    notes: any[];
    dispatch: Function;
    watchedNoteFiles: string[];
    plugins: PluginStates;
}
export default class NoteListUtils {
    static makeContextMenu(noteIds: string[], props: ContextMenuProps): any;
    static confirmDeleteNotes(noteIds: string[]): Promise<void>;
}
export {};
