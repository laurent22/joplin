import { State as PluginServiceState } from 'lib/services/plugins/reducer';
interface StateLastSelectedNotesIds {
    Folder: any;
    Tag: any;
    Search: any;
}
interface StateClipperServer {
    startState: string;
    port: number;
}
interface StateDecryptionWorker {
    state: string;
    itemIndex: number;
    itemCount: number;
    decryptedItemCounts: any;
    decryptedItemCount: number;
    skippedItemCount: number;
}
interface StateResourceFetcher {
    toFetchCount: number;
}
export interface State {
    notes: any[];
    notesSource: string;
    notesParentType: string;
    folders: any[];
    tags: any[];
    masterKeys: any[];
    notLoadedMasterKeys: any[];
    searches: any[];
    highlightedWords: string[];
    selectedNoteIds: string[];
    selectedNoteHash: string;
    selectedFolderId: string;
    selectedTagId: string;
    selectedSearchId: string;
    selectedItemType: string;
    selectedSmartFilterId: string;
    lastSelectedNotesIds: StateLastSelectedNotesIds;
    showSideMenu: boolean;
    screens: any;
    historyCanGoBack: boolean;
    syncStarted: boolean;
    syncReport: any;
    searchQuery: string;
    settings: any;
    sharedData: any;
    appState: string;
    hasDisabledSyncItems: boolean;
    hasDisabledEncryptionItems: boolean;
    customCss: string;
    templates: any[];
    collapsedFolderIds: string[];
    clipperServer: StateClipperServer;
    decryptionWorker: StateDecryptionWorker;
    selectedNoteTags: any[];
    resourceFetcher: StateResourceFetcher;
    backwardHistoryNotes: any[];
    forwardHistoryNotes: any[];
    pluginsLegacy: any;
    provisionalNoteIds: string[];
    editorNoteStatuses: any;
    isInsertingNotes: boolean;
    hasEncryptedItems: boolean;
    pluginService: PluginServiceState;
}
export declare const defaultState: State;
export declare const MAX_HISTORY = 200;
export declare const stateUtils: any;
declare const reducer: <Base extends {
    readonly notes: readonly any[];
    readonly notesSource: string;
    readonly notesParentType: string;
    readonly folders: readonly any[];
    readonly tags: readonly any[];
    readonly masterKeys: readonly any[];
    readonly notLoadedMasterKeys: readonly any[];
    readonly searches: readonly any[];
    readonly highlightedWords: readonly string[];
    readonly selectedNoteIds: readonly string[];
    readonly selectedNoteHash: string;
    readonly selectedFolderId: string;
    readonly selectedTagId: string;
    readonly selectedSearchId: string;
    readonly selectedItemType: string;
    readonly selectedSmartFilterId: string;
    readonly lastSelectedNotesIds: {
        readonly Folder: any;
        readonly Tag: any;
        readonly Search: any;
    };
    readonly showSideMenu: boolean;
    readonly screens: any;
    readonly historyCanGoBack: boolean;
    readonly syncStarted: boolean;
    readonly syncReport: any;
    readonly searchQuery: string;
    readonly settings: any;
    readonly sharedData: any;
    readonly appState: string;
    readonly hasDisabledSyncItems: boolean;
    readonly hasDisabledEncryptionItems: boolean;
    readonly customCss: string;
    readonly templates: readonly any[];
    readonly collapsedFolderIds: readonly string[];
    readonly clipperServer: {
        readonly startState: string;
        readonly port: number;
    };
    readonly decryptionWorker: {
        readonly state: string;
        readonly itemIndex: number;
        readonly itemCount: number;
        readonly decryptedItemCounts: any;
        readonly decryptedItemCount: number;
        readonly skippedItemCount: number;
    };
    readonly selectedNoteTags: readonly any[];
    readonly resourceFetcher: {
        readonly toFetchCount: number;
    };
    readonly backwardHistoryNotes: readonly any[];
    readonly forwardHistoryNotes: readonly any[];
    readonly pluginsLegacy: any;
    readonly provisionalNoteIds: readonly string[];
    readonly editorNoteStatuses: any;
    readonly isInsertingNotes: boolean;
    readonly hasEncryptedItems: boolean;
    readonly pluginService: {
        readonly plugins: {
            readonly [x: string]: {
                readonly id: string;
                readonly views: {
                    readonly [x: string]: {
                        readonly id: string;
                        readonly type: string;
                    };
                };
            };
        };
    };
}>(base: Base, action: any) => Base;
export default reducer;
