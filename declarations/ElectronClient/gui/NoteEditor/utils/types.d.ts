import AsyncActionQueue from '../../../lib/AsyncActionQueue';
import { ToolbarButtonInfo } from 'lib/services/commands/ToolbarButtonUtils';
import { PluginStates } from 'lib/services/plugins/reducer';
export interface ToolbarButtonInfos {
    [key: string]: ToolbarButtonInfo;
}
export interface NoteEditorProps {
    noteId: string;
    themeId: number;
    dispatch: Function;
    selectedNoteIds: string[];
    notes: any[];
    watchedNoteFiles: string[];
    isProvisional: boolean;
    editorNoteStatuses: any;
    syncStarted: boolean;
    bodyEditor: string;
    folders: any[];
    notesParentType: string;
    selectedNoteTags: any[];
    lastEditorScrollPercents: any;
    selectedNoteHash: string;
    searches: any[];
    selectedSearchId: string;
    customCss: string;
    noteVisiblePanes: string[];
    watchedResources: any;
    highlightedWords: any[];
    plugins: PluginStates;
    toolbarButtonInfos: ToolbarButtonInfo[];
    setTagsToolbarButtonInfo: ToolbarButtonInfo;
}
export interface NoteBodyEditorProps {
    style: any;
    ref: any;
    themeId: number;
    content: string;
    contentKey: string;
    contentMarkupLanguage: number;
    contentOriginalCss: string;
    onChange(event: OnChangeEvent): void;
    onWillChange(event: any): void;
    onMessage(event: any): void;
    onScroll(event: any): void;
    markupToHtml: Function;
    htmlToMarkdown: Function;
    allAssets: Function;
    disabled: boolean;
    dispatch: Function;
    noteToolbar: any;
    setLocalSearchResultCount(count: number): void;
    searchMarkers: any;
    visiblePanes: string[];
    keyboardMode: string;
    resourceInfos: ResourceInfos;
    locale: string;
    onDrop: Function;
    noteToolbarButtonInfos: ToolbarButtonInfo[];
    plugins: PluginStates;
}
export interface FormNote {
    id: string;
    title: string;
    body: string;
    parent_id: string;
    is_todo: number;
    bodyEditorContent?: any;
    markup_language: number;
    user_updated_time: number;
    encryption_applied: number;
    hasChanged: boolean;
    bodyWillChangeId: number;
    bodyChangeId: number;
    saveActionQueue: AsyncActionQueue;
    originalCss: string;
}
export declare function defaultFormNote(): FormNote;
export interface ResourceInfo {
    localState: any;
    item: any;
}
export interface ResourceInfos {
    [index: string]: ResourceInfo;
}
export declare enum ScrollOptionTypes {
    None = 0,
    Hash = 1,
    Percent = 2
}
export interface ScrollOptions {
    type: ScrollOptionTypes;
    value: any;
}
export interface OnChangeEvent {
    changeId: number;
    content: any;
}
export interface EditorCommand {
    name: string;
    value: any;
}
