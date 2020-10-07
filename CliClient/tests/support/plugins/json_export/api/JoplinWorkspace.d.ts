import { EditorCommand } from './types';
export default class JoplinWorkspace {
    private store;
    private implementation_;
    constructor(implementation: any, store: any);
    onNoteSelectionChange(callback: Function): Promise<void>;
    onNoteContentChange(callback: Function): Promise<void>;
    onNoteAlarmTrigger(callback: Function): Promise<void>;
    onSyncComplete(callback: Function): Promise<void>;
    selectedNote(): Promise<any>;
    selectedNoteIds(): Promise<any>;
    execEditorCommand(command: EditorCommand): Promise<any>;
}
