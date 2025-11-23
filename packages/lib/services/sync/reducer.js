"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotesParent = exports.parseNotesParent = exports.serializeNotesParent = exports.stateUtils = exports.MAX_HISTORY = exports.defaultState = exports.defaultWindowState = exports.defaultWindowId = void 0;
exports.setStore = setStore;
exports.store = store;
const immer_1 = require("immer");
const reducer_1 = require("./services/plugins/reducer");
const reducer_2 = require("./services/share/reducer");
const Note_1 = require("./models/Note");
const Folder_1 = require("./models/Folder");
const BaseModel_1 = require("./BaseModel");
const ArrayUtils = require("./ArrayUtils");
const renderers_1 = require("./services/noteList/renderers");
const trash_1 = require("./services/trash");
const Logger_1 = require("@joplin/utils/Logger");
const types_1 = require("./services/plugins/api/types");
const fastDeepEqual = require('fast-deep-equal');
const { ALL_NOTES_FILTER_ID } = require('./reserved-ids');
const { createSelectorCreator, defaultMemoize } = require('reselect');
const { createCachedSelector } = require('re-reselect');
const logger = Logger_1.default.create('lib/reducer');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const additionalReducers = [];
additionalReducers.push({
    stateRootKey: reducer_1.stateRootKey,
    defaultState: reducer_1.defaultState,
    reducer: reducer_1.default,
});
additionalReducers.push({
    stateRootKey: reducer_2.stateRootKey,
    defaultState: reducer_2.defaultState,
    reducer: reducer_2.default,
});
exports.defaultWindowId = 'default';
exports.defaultWindowState = {
    windowId: exports.defaultWindowId,
    searchQuery: '',
    notes: [],
    notesSource: '',
    notesParentType: null,
    selectedNoteIds: [],
    selectedNoteHash: '',
    selectedFolderId: null,
    selectedTagId: null,
    selectedSearchId: null,
    selectedSmartFilterId: null,
    selectedItemType: 'note',
    selectedNoteTags: [],
    backwardHistoryNotes: [],
    forwardHistoryNotes: [],
    lastSelectedNotesIds: {
        Folder: {},
        Tag: {},
        Search: {},
    },
};
exports.defaultState = Object.assign(Object.assign({}, exports.defaultWindowState), { backgroundWindows: {}, folders: [], tags: [], masterKeys: [], notLoadedMasterKeys: [], searches: [], highlightedWords: [], showSideMenu: false, screens: {}, historyCanGoBack: false, syncStarted: false, syncReport: {}, searchQuery: '', searchResults: [], settings: {}, sharedData: null, appState: 'starting', biometricsDone: false, hasDisabledSyncItems: false, hasDisabledEncryptionItems: false, customViewerCss: '', customChromeCssPaths: [], collapsedFolderIds: [], clipperServer: {
        startState: 'idle',
        port: null,
    }, decryptionWorker: {
        state: 'idle',
        itemIndex: 0,
        itemCount: 0,
        decryptedItemCounts: {},
        decryptedItemCount: 0,
        skippedItemCount: 0,
    }, resourceFetcher: {
        toFetchCount: 0,
        fetchingCount: 0,
    }, 
    // pluginsLegacy is the original plugin system, which eventually was used only for GotoAnything.
    // GotoAnything should be refactored to part of core and when it's done the pluginsLegacy key can
    // be removed. It was originally named "plugins", then renamed "pluginsLegacy" so as not to conflict
    // with the new "plugins" key used for the new plugin system.
    pluginsLegacy: {}, provisionalNoteIds: [], editorNoteStatuses: {}, isInsertingNotes: false, hasEncryptedItems: false, needApiAuth: false, profileConfig: null, noteListRendererIds: (0, renderers_1.getListRendererIds)(), noteListLastSortTime: 0, lastDeletion: {
        noteIds: [],
        folderIds: [],
        timestamp: 0,
    }, lastDeletionNotificationTime: 0, mustUpgradeAppMessage: '', mustAuthenticate: false, allowSelectionInOtherFolders: false, editorNoteReloadTimeRequest: 0, noteHtmlToMarkdownDone: '', pluginService: reducer_1.defaultState, shareService: reducer_2.defaultState, toast: null });
for (const additionalReducer of additionalReducers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    exports.defaultState[additionalReducer.stateRootKey] = additionalReducer.defaultState;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let store_ = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function setStore(v) {
    store_ = v;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function store() {
    return store_;
}
exports.MAX_HISTORY = 200;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const derivedStateCache_ = {};
// Allows, for a given state, to return the same derived
// objects, to prevent unnecessary updates on calling components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const cacheEnabledOutput = (key, output) => {
    key = `${key}_${JSON.stringify(output)}`;
    if (derivedStateCache_[key])
        return derivedStateCache_[key];
    derivedStateCache_[key] = output;
    return derivedStateCache_[key];
};
const createShallowArrayEqualSelector = createSelectorCreator(defaultMemoize, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
(prev, next) => {
    if (prev.length !== next.length)
        return false;
    for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== next[i])
            return false;
    }
    return true;
});
const selectArrayShallow = createCachedSelector(
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
(state) => state.array, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
(array) => array)({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    keySelector: (_state, cacheKey) => {
        return cacheKey;
    },
    selectorCreator: createShallowArrayEqualSelector,
});
class StateUtils {
    // Given an input array, this selector ensures that the same array is returned
    // if its content hasn't changed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    selectArrayShallow(props, cacheKey) {
        return selectArrayShallow(props, cacheKey);
    }
    oneNoteSelected(state) {
        return state.selectedNoteIds.length === 1;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    notesOrder(stateSettings) {
        if (stateSettings['notes.sortOrder.field'] === 'order') {
            return cacheEnabledOutput('notesOrder', [
                {
                    by: 'order',
                    dir: 'DESC',
                },
                {
                    by: 'user_created_time',
                    dir: 'DESC',
                },
            ]);
        }
        else {
            return cacheEnabledOutput('notesOrder', [
                {
                    by: stateSettings['notes.sortOrder.field'],
                    dir: stateSettings['notes.sortOrder.reverse'] ? 'DESC' : 'ASC',
                },
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    foldersOrder(stateSettings) {
        return cacheEnabledOutput('foldersOrder', [
            {
                by: stateSettings['folders.sortOrder.field'],
                dir: stateSettings['folders.sortOrder.reverse'] ? 'DESC' : 'ASC',
            },
        ]);
    }
    hasNotesBeingSaved(state) {
        for (const id in state.editorNoteStatuses) {
            if (state.editorNoteStatuses[id] === 'saving')
                return true;
        }
        return false;
    }
    parentItem(state) {
        const t = state.notesParentType;
        let id = null;
        if (t === 'Folder')
            id = state.selectedFolderId;
        if (t === 'Tag')
            id = state.selectedTagId;
        if (t === 'Search')
            id = state.selectedSearchId;
        if (!t || !id)
            return null;
        return { type: t, id: id };
    }
    lastSelectedNoteIds(state) {
        const parent = this.parentItem(state);
        if (!parent)
            return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = state.lastSelectedNotesIds[parent.type][parent.id];
        return output ? output : [];
    }
    selectedNote(state) {
        const noteId = this.selectedNoteId(state);
        return noteId ? BaseModel_1.default.byId(state.notes, noteId) : null;
    }
    selectedNoteId(state) {
        return state.selectedNoteIds.length ? state.selectedNoteIds[0] : null;
    }
    activeWindowId(state) {
        return state.windowId;
    }
    allWindowIds(state) {
        return [state.windowId, ...Object.keys(state.backgroundWindows)];
    }
    allWindowStates(state) {
        return this.allWindowIds(state).map(id => this.windowStateById(state, id));
    }
    windowStateById(state, id) {
        const result = id === state.windowId ? state : state.backgroundWindows[id];
        return result;
    }
    mainWindowState(state) {
        return this.windowStateById(state, exports.defaultWindowId);
    }
    secondaryWindowStates(state) {
        const windowIds = [state.windowId, ...Object.keys(state.backgroundWindows)];
        return windowIds
            .filter(id => (id !== exports.defaultWindowId))
            .map(id => this.windowStateById(state, id));
    }
    windowIdToSelectedNoteIds(state) {
        const result = {};
        for (const id of this.allWindowIds(state)) {
            result[id] = this.windowStateById(state, id).selectedNoteIds;
        }
        return result;
    }
}
exports.stateUtils = new StateUtils();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function arrayHasEncryptedItems(array) {
    for (let i = 0; i < array.length; i++) {
        if (array[i].encryption_applied)
            return true;
    }
    return false;
}
function stateHasEncryptedItems(state) {
    if (arrayHasEncryptedItems(state.notes))
        return true;
    if (arrayHasEncryptedItems(state.folders))
        return true;
    if (arrayHasEncryptedItems(state.tags))
        return true;
    return false;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function folderSetCollapsed(draft, action) {
    if (action.ids) {
        draft.collapsedFolderIds = action.ids;
        return;
    }
    const collapsedFolderIds = draft.collapsedFolderIds.slice();
    const idx = collapsedFolderIds.indexOf(action.id);
    if (action.collapsed) {
        if (idx >= 0)
            return;
        collapsedFolderIds.push(action.id);
    }
    else {
        if (idx < 0)
            return;
        collapsedFolderIds.splice(idx, 1);
    }
    draft.collapsedFolderIds = collapsedFolderIds;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function removeAdjacentDuplicates(items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    return items.filter((item, idx) => (idx >= 1) ? items[idx - 1].id !== item.id : true);
}
// When deleting a note, tag or folder
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function handleItemDelete(draft, action) {
    const map = {
        FOLDER_DELETE: ['folders', 'selectedFolderId', true],
        NOTE_DELETE: ['notes', 'selectedNoteIds', false],
        TAG_DELETE: ['tags', 'selectedTagId', true],
        SEARCH_DELETE: ['searches', 'selectedSearchId', true],
    };
    const listKey = map[action.type][0];
    const selectedItemKey = map[action.type][1];
    const isSingular = map[action.type][2];
    for (const windowDraft of exports.stateUtils.allWindowStates(draft)) {
        const selectedItemKeys = isSingular ? [windowDraft[selectedItemKey]] : windowDraft[selectedItemKey];
        const isSelected = selectedItemKeys.includes(action.id);
        const items = listKey in windowDraft ? windowDraft[listKey] : draft[listKey];
        const newItems = [];
        let newSelectedIndexes = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (isSelected) {
                // the selected item is deleted so select the following item
                // if multiple items are selected then just use the first one
                if (selectedItemKeys[0] === item.id) {
                    newSelectedIndexes.push(newItems.length);
                }
            }
            else {
                // the selected item/s is not deleted so keep it selected
                if (selectedItemKeys.includes(item.id)) {
                    newSelectedIndexes.push(newItems.length);
                }
            }
            if (item.id === action.id) {
                continue;
            }
            newItems.push(item);
        }
        if (newItems.length === 0) {
            newSelectedIndexes = []; // no remaining items so no selection
        }
        else if (newSelectedIndexes.length === 0) {
            newSelectedIndexes.push(0); // no selection exists so select the top
        }
        else {
            // when the items at end of list are deleted then select the end
            for (let i = 0; i < newSelectedIndexes.length; i++) {
                if (newSelectedIndexes[i] >= newItems.length) {
                    newSelectedIndexes = [newItems.length - 1];
                    break;
                }
            }
        }
        if (listKey in windowDraft) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            windowDraft[listKey] = newItems;
        }
        const newIds = [];
        for (let i = 0; i < newSelectedIndexes.length; i++) {
            newIds.push(newItems[newSelectedIndexes[i]].id);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        windowDraft[selectedItemKey] = isSingular ? newIds[0] : newIds;
        if ((newIds.length === 0) && windowDraft.notesParentType !== 'Folder') {
            windowDraft.notesParentType = 'Folder';
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function updateOneItem(draft, action, keyName = '') {
    let itemsKey = null;
    if (keyName) {
        itemsKey = keyName;
    }
    else {
        if (action.type === 'TAG_UPDATE_ONE')
            itemsKey = 'tags';
        if (action.type === 'FOLDER_UPDATE_ONE')
            itemsKey = 'folders';
        if (action.type === 'MASTERKEY_UPDATE_ONE')
            itemsKey = 'masterKeys';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const newItems = draft[itemsKey].slice();
    const item = action.item;
    let found = false;
    for (let i = 0; i < newItems.length; i++) {
        const n = newItems[i];
        if (n.id === item.id) {
            newItems[i] = Object.assign(Object.assign({}, newItems[i]), item);
            found = true;
            break;
        }
    }
    if (!found)
        newItems.push(item);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    draft[itemsKey] = newItems;
}
function updateSelectedNotesFromExistingNotes(draft) {
    const newSelectedNoteIds = [];
    for (const selectedNoteId of draft.selectedNoteIds) {
        for (const n of draft.notes) {
            if (n.id === selectedNoteId) {
                newSelectedNoteIds.push(n.id);
            }
        }
    }
    if (JSON.stringify(draft.selectedNoteIds) === JSON.stringify(newSelectedNoteIds))
        return;
    draft.selectedNoteIds = newSelectedNoteIds;
}
function defaultNotesParentType(draft, exclusion) {
    let newNotesParentType = null;
    if (exclusion !== 'SmartFilter' && draft.selectedSmartFilterId) {
        newNotesParentType = 'SmartFilter';
    }
    else if (exclusion !== 'Folder' && draft.selectedFolderId) {
        newNotesParentType = 'Folder';
    }
    else if (exclusion !== 'Tag' && draft.selectedTagId) {
        newNotesParentType = 'Tag';
    }
    else if (exclusion !== 'Search' && draft.selectedSearchId) {
        newNotesParentType = 'Search';
    }
    return newNotesParentType;
}
const serializeNotesParent = (n) => {
    return JSON.stringify(n);
};
exports.serializeNotesParent = serializeNotesParent;
const parseNotesParent = (s, activeFolderId) => {
    const defaultValue = {
        type: 'Folder',
        selectedItemId: activeFolderId,
    };
    if (!s)
        return defaultValue;
    try {
        const parsed = JSON.parse(s);
        return parsed;
    }
    catch (error) {
        return defaultValue;
    }
};
exports.parseNotesParent = parseNotesParent;
const getNotesParent = (state) => {
    let type = state.notesParentType;
    let selectedItemId = '';
    if (type === 'Folder') {
        selectedItemId = state.selectedFolderId;
    }
    else if (type === 'Tag') {
        selectedItemId = state.selectedTagId;
    }
    else if (type === 'SmartFilter') {
        selectedItemId = state.selectedSmartFilterId;
    }
    else {
        type = 'Folder';
        selectedItemId = state.selectedFolderId;
    }
    return { type, selectedItemId };
};
exports.getNotesParent = getNotesParent;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function changeSelectedFolder(draft, action, options = null) {
    if (!options)
        options = {};
    draft.selectedFolderId = 'folderId' in action ? action.folderId : action.id;
    if (!draft.selectedFolderId) {
        draft.notesParentType = defaultNotesParentType(draft, 'Folder');
    }
    else {
        draft.notesParentType = 'Folder';
    }
    if (options.clearSelectedNoteIds)
        draft.selectedNoteIds = [];
}
function recordLastSelectedNoteIds(draft, noteIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const newOnes = Object.assign({}, draft.lastSelectedNotesIds);
    const parent = exports.stateUtils.parentItem(draft);
    if (!parent)
        return;
    newOnes[parent.type] = Object.assign({}, newOnes[parent.type]);
    newOnes[parent.type][parent.id] = noteIds.slice();
    draft.lastSelectedNotesIds = newOnes;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function changeSelectedNotes(draft, action, options = null) {
    if (!options)
        options = {};
    let noteIds = [];
    if (action.id)
        noteIds = [action.id];
    if (action.ids)
        noteIds = action.ids;
    if (action.noteId)
        noteIds = [action.noteId];
    if (action.index)
        noteIds = [draft.notes[action.index].id];
    if (action.type === 'NOTE_SELECT') {
        if (JSON.stringify(draft.selectedNoteIds) === JSON.stringify(noteIds))
            return;
        draft.selectedNoteIds = noteIds;
        draft.selectedNoteHash = action.hash ? action.hash : '';
    }
    else if (action.type === 'NOTE_SELECT_ADD') {
        if (!noteIds.length)
            return;
        draft.selectedNoteIds = ArrayUtils.unique(draft.selectedNoteIds.concat(noteIds));
    }
    else if (action.type === 'NOTE_SELECT_REMOVE') {
        if (!noteIds.length)
            return; // Nothing to unselect
        if (draft.selectedNoteIds.length <= 1)
            return; // Cannot unselect the last note
        const newSelectedNoteIds = [];
        for (let i = 0; i < draft.selectedNoteIds.length; i++) {
            const id = draft.selectedNoteIds[i];
            if (noteIds.indexOf(id) >= 0)
                continue;
            newSelectedNoteIds.push(id);
        }
        draft.selectedNoteIds = newSelectedNoteIds;
    }
    else if (action.type === 'NOTE_SELECT_TOGGLE') {
        if (!noteIds.length)
            return;
        if (draft.selectedNoteIds.indexOf(noteIds[0]) >= 0) {
            changeSelectedNotes(draft, { type: 'NOTE_SELECT_REMOVE', id: noteIds[0] });
        }
        else {
            changeSelectedNotes(draft, { type: 'NOTE_SELECT_ADD', id: noteIds[0] });
        }
    }
    else {
        throw new Error('Unreachable');
    }
    recordLastSelectedNoteIds(draft, draft.selectedNoteIds);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function removeItemFromArray(array, property, value) {
    for (let i = 0; i !== array.length; ++i) {
        const currentItem = array[i];
        if (currentItem[property] === value) {
            array = array.slice();
            array.splice(i, 1);
            break;
        }
    }
    return array;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const getContextFromHistory = (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const result = {};
    result.notesParentType = ctx.notesParentType;
    if (result.notesParentType === 'Folder') {
        result.selectedFolderId = ctx.selectedFolderId;
    }
    else if (result.notesParentType === 'Tag') {
        result.selectedTagId = ctx.selectedTagId;
    }
    else if (result.notesParentType === 'Search') {
        result.selectedSearchId = ctx.selectedSearchId;
        result.searches = ctx.searches;
    }
    else if (result.notesParentType === 'SmartFilter') {
        result.selectedSmartFilterId = ctx.selectedSmartFilterId;
    }
    return result;
};
function getNoteHistoryInfo(state) {
    const selectedNoteIds = state.selectedNoteIds;
    const notes = state.notes;
    if (selectedNoteIds && selectedNoteIds.length > 0) {
        const currNote = notes.find(note => note.id === selectedNoteIds[0]);
        if (currNote) {
            return {
                id: currNote.id,
                parent_id: currNote.parent_id,
                notesParentType: state.notesParentType,
                selectedFolderId: state.selectedFolderId,
                selectedTagId: state.selectedTagId,
                selectedSearchId: state.selectedSearchId,
                searches: state.searches,
                selectedSmartFilterId: state.selectedSmartFilterId,
            };
        }
    }
    return null;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function handleHistory(draft, action) {
    const currentNote = getNoteHistoryInfo(draft);
    switch (action.type) {
        case 'HISTORY_BACKWARD': {
            const note = draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1];
            if (currentNote && (draft.forwardHistoryNotes.length === 0 || currentNote.id !== draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1].id)) {
                draft.forwardHistoryNotes = draft.forwardHistoryNotes.concat(currentNote).slice(-exports.MAX_HISTORY);
            }
            changeSelectedFolder(draft, Object.assign(Object.assign({}, action), { type: 'FOLDER_SELECT', folderId: note.parent_id }));
            changeSelectedNotes(draft, Object.assign(Object.assign({}, action), { type: 'NOTE_SELECT', noteId: note.id }));
            const ctx = draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1];
            Object.assign(draft, getContextFromHistory(ctx));
            draft.backwardHistoryNotes.pop();
            break;
        }
        case 'HISTORY_FORWARD': {
            const note = draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1];
            if (currentNote && (draft.backwardHistoryNotes.length === 0 || currentNote.id !== draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id)) {
                draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-exports.MAX_HISTORY);
            }
            changeSelectedFolder(draft, Object.assign(Object.assign({}, action), { type: 'FOLDER_SELECT', folderId: note.parent_id }));
            changeSelectedNotes(draft, Object.assign(Object.assign({}, action), { type: 'NOTE_SELECT', noteId: note.id }));
            const ctx = draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1];
            Object.assign(draft, getContextFromHistory(ctx));
            draft.forwardHistoryNotes.pop();
            break;
        }
        case 'NOTE_SELECT':
            if (currentNote && action.id !== currentNote.id) {
                draft.forwardHistoryNotes = [];
                draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-exports.MAX_HISTORY);
            }
            // History should be free from duplicates.
            if (draft.backwardHistoryNotes && draft.backwardHistoryNotes.length > 0 &&
                action.id === draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id) {
                draft.backwardHistoryNotes.pop();
            }
            break;
        case 'TAG_SELECT':
        case 'FOLDER_AND_NOTE_SELECT':
        case 'FOLDER_SELECT':
            if (currentNote) {
                if (draft.forwardHistoryNotes.length)
                    draft.forwardHistoryNotes = [];
                draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-exports.MAX_HISTORY);
            }
            break;
        case 'SEARCH_UPDATE':
            if (currentNote && (draft.backwardHistoryNotes.length === 0 ||
                draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id !== currentNote.id)) {
                if (draft.forwardHistoryNotes.length)
                    draft.forwardHistoryNotes = [];
                draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-exports.MAX_HISTORY);
            }
            break;
        case 'SEARCH_RESULTS_SET':
            draft.searchResults = action.value;
            break;
    }
    const updateWindowHistory = (windowDraft) => {
        switch (action.type) {
            case 'NOTE_UPDATE_ONE': {
                const modNote = action.note;
                windowDraft.backwardHistoryNotes = windowDraft.backwardHistoryNotes.map(note => {
                    if (note.id === modNote.id) {
                        return Object.assign(Object.assign({}, note), { parent_id: modNote.parent_id, selectedFolderId: modNote.parent_id });
                    }
                    return note;
                });
                windowDraft.forwardHistoryNotes = windowDraft.forwardHistoryNotes.map(note => {
                    if (note.id === modNote.id) {
                        return Object.assign(Object.assign({}, note), { parent_id: modNote.parent_id, selectedFolderId: modNote.parent_id });
                    }
                    return note;
                });
                break;
            }
            case 'FOLDER_DELETE':
                windowDraft.backwardHistoryNotes = windowDraft.backwardHistoryNotes.filter(note => note.parent_id !== action.id);
                windowDraft.forwardHistoryNotes = windowDraft.forwardHistoryNotes.filter(note => note.parent_id !== action.id);
                windowDraft.backwardHistoryNotes = removeAdjacentDuplicates(windowDraft.backwardHistoryNotes);
                windowDraft.forwardHistoryNotes = removeAdjacentDuplicates(windowDraft.forwardHistoryNotes);
                break;
            case 'NOTE_DELETE': {
                windowDraft.backwardHistoryNotes = windowDraft.backwardHistoryNotes.filter(note => note.id !== action.id);
                windowDraft.forwardHistoryNotes = windowDraft.forwardHistoryNotes.filter(note => note.id !== action.id);
                windowDraft.backwardHistoryNotes = removeAdjacentDuplicates(windowDraft.backwardHistoryNotes);
                windowDraft.forwardHistoryNotes = removeAdjacentDuplicates(windowDraft.forwardHistoryNotes);
                // Fix the case where after deletion the currently selected note is also the latest in history
                const selectedNoteIds = windowDraft.selectedNoteIds;
                if (selectedNoteIds.length && windowDraft.backwardHistoryNotes.length && windowDraft.backwardHistoryNotes[windowDraft.backwardHistoryNotes.length - 1].id === selectedNoteIds[0]) {
                    windowDraft.backwardHistoryNotes = windowDraft.backwardHistoryNotes.slice(0, windowDraft.backwardHistoryNotes.length - 1);
                }
                if (selectedNoteIds.length && windowDraft.forwardHistoryNotes.length && windowDraft.forwardHistoryNotes[windowDraft.forwardHistoryNotes.length - 1].id === selectedNoteIds[0]) {
                    windowDraft.forwardHistoryNotes = windowDraft.forwardHistoryNotes.slice(0, windowDraft.forwardHistoryNotes.length - 1);
                }
                break;
            }
        }
    };
    updateWindowHistory(draft);
    for (const id in draft.backgroundWindows) {
        updateWindowHistory(draft.backgroundWindows[id]);
    }
}
const handleWindowActions = (draft, action) => {
    const handleFocus = (windowId) => {
        // Only allow bringing a background window to the foreground
        if (draft.windowId !== windowId) {
            const previousWindowId = draft.windowId;
            const focusingWindowState = draft.backgroundWindows[windowId];
            const previousWindowState = Object.assign({}, exports.defaultWindowState);
            for (const key of Object.keys(focusingWindowState)) {
                const stateKey = key;
                previousWindowState[stateKey] = draft[stateKey];
                draft[stateKey] = focusingWindowState[stateKey];
            }
            delete draft.backgroundWindows[windowId];
            draft.backgroundWindows[previousWindowId] = previousWindowState;
        }
    };
    switch (action.type) {
        case 'WINDOW_OPEN': {
            if (action.windowId in draft.backgroundWindows) {
                throw new Error(`Window with id ${action.windowId} is already open!`);
            }
            draft.backgroundWindows[action.windowId] = Object.assign(Object.assign(Object.assign({}, exports.defaultWindowState), action.defaultAppWindowState), { lastSelectedNotesIds: Object.assign(Object.assign({}, exports.defaultWindowState.lastSelectedNotesIds), { Folder: {
                        [action.folderId]: [action.noteId],
                    } }), notesParentType: 'Folder', selectedFolderId: action.folderId, windowId: action.windowId, selectedNoteIds: [action.noteId] });
            break;
        }
        case 'WINDOW_FOCUS':
            handleFocus(action.windowId);
            break;
        case 'WINDOW_CLOSE': {
            const isFocusedWindow = draft.windowId === action.windowId;
            if (isFocusedWindow) {
                const firstBackgroundWindow = Object.keys(draft.backgroundWindows)[0];
                handleFocus(firstBackgroundWindow);
            }
            delete draft.backgroundWindows[action.windowId];
            break;
        }
    }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const reducer = (0, immer_1.produce)((draft = exports.defaultState, action) => {
    // const reducer = (state:State = defaultState, action:any) => {
    // if (!['SIDE_MENU_OPEN_PERCENT'].includes(action.type)) console.info('Action', action.type, action);
    var _a;
    // let newState = state;
    // NOTE_DELETE requires post processing
    if (action.type !== 'NOTE_DELETE') {
        handleHistory(draft, action);
    }
    handleWindowActions(draft, action);
    try {
        switch (action.type) {
            case 'NOTE_SELECT':
            case 'NOTE_SELECT_ADD':
            case 'NOTE_SELECT_REMOVE':
            case 'NOTE_SELECT_TOGGLE':
                changeSelectedNotes(draft, action);
                break;
            case 'NOTE_SELECT_EXTEND':
                {
                    if (!draft.selectedNoteIds.length) {
                        draft.selectedNoteIds = [action.id];
                    }
                    else {
                        const selectRangeId1 = draft.selectedNoteIds[draft.selectedNoteIds.length - 1];
                        const selectRangeId2 = action.id;
                        if (selectRangeId1 === selectRangeId2) {
                            // Nothing
                        }
                        else {
                            const newSelectedNoteIds = draft.selectedNoteIds.slice();
                            let selectionStarted = false;
                            for (let i = 0; i < draft.notes.length; i++) {
                                const id = draft.notes[i].id;
                                if (!selectionStarted && (id === selectRangeId1 || id === selectRangeId2)) {
                                    selectionStarted = true;
                                    if (newSelectedNoteIds.indexOf(id) < 0)
                                        newSelectedNoteIds.push(id);
                                    continue;
                                }
                                else if (selectionStarted && (id === selectRangeId1 || id === selectRangeId2)) {
                                    if (newSelectedNoteIds.indexOf(id) < 0)
                                        newSelectedNoteIds.push(id);
                                    break;
                                }
                                if (selectionStarted && newSelectedNoteIds.indexOf(id) < 0) {
                                    newSelectedNoteIds.push(id);
                                }
                            }
                            draft.selectedNoteIds = newSelectedNoteIds;
                        }
                    }
                }
                break;
            case 'NOTE_SELECT_ALL':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                draft.selectedNoteIds = draft.notes.map((n) => n.id);
                break;
            case 'NOTE_SELECT_ALL_TOGGLE': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const allSelected = draft.notes.every((n) => draft.selectedNoteIds.includes(n.id));
                if (allSelected) {
                    draft.selectedNoteIds = [];
                }
                else {
                    draft.selectedNoteIds = draft.notes.map(n => n.id);
                }
                break;
            }
            case 'SMART_FILTER_SELECT':
                draft.notesParentType = 'SmartFilter';
                draft.selectedSmartFilterId = action.id;
                break;
            case 'FOLDER_SELECT':
                changeSelectedFolder(draft, action, { clearSelectedNoteIds: true });
                break;
            case 'FOLDER_AND_NOTE_SELECT':
                {
                    changeSelectedFolder(draft, action);
                    const noteSelectAction = Object.assign(Object.assign({}, action), { type: 'NOTE_SELECT' });
                    changeSelectedNotes(draft, noteSelectAction);
                }
                break;
            case 'SETTING_UPDATE_ALL':
                draft.settings = action.settings;
                break;
            case 'SETTING_UPDATE_ONE':
                {
                    const newSettings = Object.assign({}, draft.settings);
                    newSettings[action.key] = action.value;
                    draft.settings = newSettings;
                }
                break;
            case 'NOTE_HTML_TO_MARKDOWN_DONE':
                draft.noteHtmlToMarkdownDone = action.value;
                break;
            case 'ITEMS_TRASHED':
                draft.lastDeletion = Object.assign(Object.assign({}, action.value), { timestamp: Date.now() });
                break;
            case 'DELETION_NOTIFICATION_DONE':
                draft.lastDeletionNotificationTime = Date.now();
                break;
            case 'NOTE_PROVISIONAL_FLAG_CLEAR':
                {
                    const newIds = ArrayUtils.removeElement(draft.provisionalNoteIds, action.id);
                    if (newIds !== draft.provisionalNoteIds) {
                        draft.provisionalNoteIds = newIds;
                    }
                }
                break;
            // Replace all the notes with the provided array
            case 'NOTE_UPDATE_ALL':
                draft.notes = action.notes;
                draft.notesSource = action.notesSource;
                draft.noteListLastSortTime = Date.now(); // Notes are already sorted when they are set this way.
                if (!draft.allowSelectionInOtherFolders) {
                    updateSelectedNotesFromExistingNotes(draft);
                }
                break;
            // Insert the note into the note list if it's new, or
            // update it within the note array if it already exists.
            case 'NOTE_UPDATE_ONE':
                {
                    const modNote = action.note;
                    const handleWindowState = (windowDraft) => {
                        var _a;
                        const isViewingAllNotes = (windowDraft.notesParentType === 'SmartFilter' && windowDraft.selectedSmartFilterId === ALL_NOTES_FILTER_ID);
                        const isViewingConflictFolder = windowDraft.notesParentType === 'Folder' && windowDraft.selectedFolderId === Folder_1.default.conflictFolderId();
                        const noteIsInFolder = function (note, folderId) {
                            if (note.is_conflict && isViewingConflictFolder)
                                return true;
                            const noteDisplayParentId = (0, trash_1.getDisplayParentId)(note, draft.folders.find(f => f.id === note.parent_id));
                            return folderId === noteDisplayParentId;
                        };
                        let movedNotePreviousIndex = 0;
                        let noteFolderHasChanged = false;
                        const newNotes = windowDraft.notes.slice();
                        let found = false;
                        for (let i = 0; i < newNotes.length; i++) {
                            const n = newNotes[i];
                            if (n.id === modNote.id) {
                                const previousDisplayParentId = ('parent_id' in n) ? (0, trash_1.getDisplayParentId)(n, draft.folders.find(f => f.id === n.parent_id)) : '';
                                if (n.is_conflict && !modNote.is_conflict) {
                                    // Note was a conflict but was moved outside of
                                    // the conflict folder
                                    newNotes.splice(i, 1);
                                    noteFolderHasChanged = true;
                                    movedNotePreviousIndex = i;
                                }
                                else if (isViewingAllNotes || noteIsInFolder(modNote, previousDisplayParentId)) {
                                    // Note is still in the same folder
                                    // Merge the properties that have changed (in modNote) into
                                    // the object we already have.
                                    newNotes[i] = Object.assign({}, newNotes[i]);
                                    for (const n in modNote) {
                                        if (!modNote.hasOwnProperty(n))
                                            continue;
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                                        newNotes[i][n] = modNote[n];
                                    }
                                }
                                else {
                                    // Note has moved to a different folder
                                    newNotes.splice(i, 1);
                                    noteFolderHasChanged = true;
                                    movedNotePreviousIndex = i;
                                }
                                found = true;
                                break;
                            }
                        }
                        // Note was not found - if the current folder is the same as the note folder,
                        // add it to it.
                        if (!found) {
                            if (isViewingAllNotes || noteIsInFolder(modNote, windowDraft.selectedFolderId)) {
                                newNotes.push(modNote);
                            }
                        }
                        windowDraft.notes = newNotes;
                        // Ensure that the selected note is still in the current folder.
                        // For example, if the user drags the current note to a different folder,
                        // a new note should be selected.
                        // In some cases, however, the selection needs to be preserved (e.g. the mobile app).
                        const preserveSelection = (_a = action.preserveSelection) !== null && _a !== void 0 ? _a : draft.allowSelectionInOtherFolders;
                        if (noteFolderHasChanged && !preserveSelection) {
                            let newIndex = movedNotePreviousIndex;
                            if (newIndex >= newNotes.length)
                                newIndex = newNotes.length - 1;
                            if (!newNotes.length)
                                newIndex = -1;
                            windowDraft.selectedNoteIds = newIndex >= 0 ? [newNotes[newIndex].id] : [];
                        }
                        if (!action.ignoreProvisionalFlag) {
                            let newProvisionalNoteIds = draft.provisionalNoteIds;
                            const idx = newProvisionalNoteIds.indexOf(modNote.id);
                            if (action.provisional) {
                                if (idx < 0) {
                                    newProvisionalNoteIds = newProvisionalNoteIds.slice();
                                    newProvisionalNoteIds.push(modNote.id);
                                }
                            }
                            else if (idx >= 0) {
                                newProvisionalNoteIds = newProvisionalNoteIds.slice();
                                newProvisionalNoteIds.splice(idx, 1);
                            }
                            draft.provisionalNoteIds = newProvisionalNoteIds;
                        }
                    };
                    handleWindowState(draft);
                    for (const backgroundWindow of Object.values(draft.backgroundWindows)) {
                        handleWindowState(backgroundWindow);
                    }
                }
                break;
            case 'NOTE_DELETE':
                {
                    handleItemDelete(draft, action);
                    const idx = draft.provisionalNoteIds.indexOf(action.id);
                    if (idx >= 0) {
                        const t = draft.provisionalNoteIds.slice();
                        t.splice(idx, 1);
                        draft.provisionalNoteIds = t;
                    }
                }
                break;
            case 'NOTE_SORT':
                {
                    if (draft.notesParentType === 'Search') {
                        logger.debug('Not sorting the note list -- sorting should be done by search.');
                    }
                    else {
                        draft.notes = Note_1.default.sortNotes(draft.notes, exports.stateUtils.notesOrder(draft.settings), draft.settings.uncompletedTodosOnTop);
                    }
                    draft.noteListLastSortTime = Date.now();
                }
                break;
            case 'NOTE_IS_INSERTING_NOTES':
                if (draft.isInsertingNotes !== action.value) {
                    draft.isInsertingNotes = action.value;
                }
                break;
            case 'TAG_DELETE':
                handleItemDelete(draft, action);
                draft.selectedNoteTags = removeItemFromArray(draft.selectedNoteTags, 'id', action.id);
                break;
            case 'FOLDER_UPDATE_ALL':
                draft.folders = action.items;
                break;
            case 'FOLDER_SET_COLLAPSED':
                folderSetCollapsed(draft, action);
                break;
            case 'FOLDER_TOGGLE':
                if (draft.collapsedFolderIds.indexOf(action.id) >= 0) {
                    folderSetCollapsed(draft, Object.assign({ collapsed: false }, action));
                }
                else {
                    folderSetCollapsed(draft, Object.assign({ collapsed: true }, action));
                }
                break;
            case 'FOLDER_SET_COLLAPSED_ALL':
                draft.collapsedFolderIds = action.ids.slice();
                break;
            case 'TAG_UPDATE_ALL':
                if (!fastDeepEqual((0, immer_1.original)(draft.tags), action.items)) {
                    draft.tags = action.items;
                }
                break;
            case 'TAG_SELECT':
                if (draft.selectedTagId !== action.id || draft.notesParentType !== 'Tag') {
                    draft.selectedTagId = action.id;
                    if (!action.id) {
                        draft.notesParentType = defaultNotesParentType(draft, 'Tag');
                    }
                    else {
                        draft.notesParentType = 'Tag';
                    }
                    draft.selectedNoteIds = [];
                }
                break;
            case 'TAG_UPDATE_ONE':
                {
                    updateOneItem(draft, action);
                    for (const windowStateDraft of exports.stateUtils.allWindowStates(draft)) {
                        // We only want to update the selected note tags if the tag belongs to the currently open note
                        const selectedNoteHasTag = !!windowStateDraft.selectedNoteTags.find(tag => tag.id === action.item.id);
                        if (selectedNoteHasTag) {
                            updateOneItem(windowStateDraft, action, 'selectedNoteTags');
                        }
                    }
                }
                break;
            case 'NOTE_TAG_REMOVE':
                {
                    updateOneItem(draft, action, 'tags');
                    const tagRemoved = action.item;
                    for (const windowStateDraft of exports.stateUtils.allWindowStates(draft)) {
                        windowStateDraft.selectedNoteTags = removeItemFromArray(windowStateDraft.selectedNoteTags, 'id', tagRemoved.id);
                    }
                }
                break;
            case 'EDITOR_NOTE_STATUS_SET':
                {
                    draft.editorNoteStatuses[action.id] = action.status;
                }
                break;
            case 'EDITOR_NOTE_STATUS_REMOVE':
                {
                    delete draft.editorNoteStatuses[action.id];
                }
                break;
            case 'FOLDER_UPDATE_ONE':
            case 'MASTERKEY_UPDATE_ONE':
                updateOneItem(draft, action);
                break;
            case 'FOLDER_DELETE':
                handleItemDelete(draft, action);
                break;
            // case 'MASTERKEY_UPDATE_ALL':
            // 	draft.masterKeys = action.items;
            // 	break;
            case 'MASTERKEY_SET_NOT_LOADED':
                draft.notLoadedMasterKeys = action.ids;
                break;
            case 'MASTERKEY_ADD_NOT_LOADED':
                {
                    if (draft.notLoadedMasterKeys.indexOf(action.id) < 0) {
                        const keys = draft.notLoadedMasterKeys.slice();
                        keys.push(action.id);
                        draft.notLoadedMasterKeys = keys;
                    }
                }
                break;
            case 'MASTERKEY_REMOVE_NOT_LOADED':
                {
                    const ids = action.id ? [action.id] : action.ids;
                    for (let i = 0; i < ids.length; i++) {
                        const id = ids[i];
                        const index = draft.notLoadedMasterKeys.indexOf(id);
                        if (index >= 0) {
                            const keys = draft.notLoadedMasterKeys.slice();
                            keys.splice(index, 1);
                            draft.notLoadedMasterKeys = keys;
                        }
                    }
                }
                break;
            case 'SYNC_STARTED':
                draft.syncStarted = true;
                break;
            case 'SYNC_COMPLETED':
                draft.syncStarted = false;
                break;
            case 'SYNC_REPORT_UPDATE':
                draft.syncReport = action.report;
                break;
            case 'SEARCH_QUERY':
                draft.searchQuery = action.query.trim();
                break;
            case 'SEARCH_ADD':
                {
                    const searches = draft.searches.slice();
                    searches.push(action.search);
                    draft.searches = searches;
                }
                break;
            case 'SEARCH_UPDATE':
                {
                    const searches = draft.searches.slice();
                    let found = false;
                    for (let i = 0; i < searches.length; i++) {
                        if (searches[i].id === action.search.id) {
                            searches[i] = Object.assign({}, action.search);
                            found = true;
                            break;
                        }
                    }
                    if (!found)
                        searches.push(action.search);
                    draft.notesParentType = 'Search';
                    draft.searches = searches;
                }
                break;
            case 'SEARCH_DELETE':
                handleItemDelete(draft, action);
                break;
            case 'SEARCH_SELECT':
                draft.selectedSearchId = action.id;
                if (!action.id) {
                    draft.notesParentType = defaultNotesParentType(draft, 'Search');
                }
                else {
                    draft.notesParentType = 'Search';
                }
                draft.selectedNoteIds = [];
                break;
            case 'SET_HIGHLIGHTED':
                draft.highlightedWords = action.words;
                break;
            case 'APP_STATE_SET':
                draft.appState = action.state;
                break;
            case 'BIOMETRICS_DONE_SET':
                draft.biometricsDone = action.value;
                break;
            case 'SYNC_HAS_DISABLED_SYNC_ITEMS':
                draft.hasDisabledSyncItems = 'value' in action ? action.value : true;
                break;
            case 'ENCRYPTION_HAS_DISABLED_ITEMS':
                draft.hasDisabledEncryptionItems = action.value;
                break;
            case 'CLIPPER_SERVER_SET':
                {
                    const clipperServer = Object.assign({}, draft.clipperServer);
                    if ('startState' in action)
                        clipperServer.startState = action.startState;
                    if ('port' in action)
                        clipperServer.port = action.port;
                    draft.clipperServer = clipperServer;
                }
                break;
            case 'DECRYPTION_WORKER_SET':
                {
                    const decryptionWorker = Object.assign({}, draft.decryptionWorker);
                    for (const n in action) {
                        if (!action.hasOwnProperty(n) || n === 'type')
                            continue;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                        decryptionWorker[n] = action[n];
                    }
                    draft.decryptionWorker = decryptionWorker;
                }
                break;
            case 'RESOURCE_FETCHER_SET':
                {
                    const rf = Object.assign({}, action);
                    delete rf.type;
                    draft.resourceFetcher = rf;
                }
                break;
            case 'CUSTOM_VIEWER_CSS_APPEND':
                draft.customViewerCss += action.css;
                break;
            case 'CUSTOM_CHROME_CSS_ADD':
                // To enable/disable custom CSS, some plugins add the same chrome CSS file multiple times.
                // For performance, only apply the last copy of each file.
                draft.customChromeCssPaths = draft.customChromeCssPaths.filter(path => path !== action.filePath);
                draft.customChromeCssPaths.push(action.filePath);
                break;
            case 'SET_NOTE_TAGS':
                if (!fastDeepEqual((0, immer_1.original)(draft.selectedNoteTags), action.items)) {
                    draft.selectedNoteTags = action.items;
                }
                break;
            case 'PLUGINLEGACY_DIALOG_SET':
                {
                    if (!action.pluginName)
                        throw new Error('action.pluginName not specified');
                    const newPluginsLegacy = Object.assign({}, draft.pluginsLegacy);
                    const newPlugin = draft.pluginsLegacy[action.pluginName] ? Object.assign({}, draft.pluginsLegacy[action.pluginName]) : {};
                    if ('open' in action)
                        newPlugin.dialogOpen = action.open;
                    if ('userData' in action)
                        newPlugin.userData = action.userData;
                    newPluginsLegacy[action.pluginName] = newPlugin;
                    draft.pluginsLegacy = newPluginsLegacy;
                }
                break;
            case 'API_NEED_AUTH_SET':
                draft.needApiAuth = action.value;
                break;
            case 'PROFILE_CONFIG_SET':
                draft.profileConfig = action.value;
                break;
            case 'MUST_UPGRADE_APP':
                draft.mustUpgradeAppMessage = action.message;
                break;
            case 'MUST_AUTHENTICATE':
                draft.mustAuthenticate = action.value;
                break;
            case 'NOTE_LIST_RENDERER_ADD':
                {
                    const noteListRendererIds = draft.noteListRendererIds.slice();
                    if (noteListRendererIds.includes(action.value))
                        throw new Error(`Note list renderer is already registered: ${action.value}`);
                    noteListRendererIds.push(action.value);
                    draft.noteListRendererIds = noteListRendererIds;
                }
                break;
            case 'EDITOR_NOTE_NEEDS_RELOAD':
                {
                    draft.editorNoteReloadTimeRequest = Date.now();
                }
                break;
            case 'TOAST_SHOW':
                draft.toast = Object.assign(Object.assign({ duration: 6000, type: types_1.ToastType.Info }, action.value), { timestamp: Date.now() });
                break;
            case 'TOAST_HIDE':
                draft.toast = null;
                break;
        }
    }
    catch (error) {
        error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
        throw error;
    }
    if (action.type.indexOf('NOTE_UPDATE') === 0 || action.type.indexOf('FOLDER_UPDATE') === 0 || action.type.indexOf('TAG_UPDATE') === 0) {
        draft.hasEncryptedItems = stateHasEncryptedItems(draft);
    }
    if (action.type === 'NOTE_DELETE') {
        handleHistory(draft, action);
    }
    if (action.type === 'SETTING_UPDATE_ALL' || (action.type === 'SETTING_UPDATE_ONE' && action.key === 'activeFolderId')) {
        // To allow creating notes when opening the app with all notes and/or tags,
        // a "last selected folder ID" needs to be set.
        (_a = draft.selectedFolderId) !== null && _a !== void 0 ? _a : (draft.selectedFolderId = draft.settings.activeFolderId);
    }
    for (const additionalReducer of additionalReducers) {
        additionalReducer.reducer(draft, action);
    }
    // if (Setting.value('env') === 'dev') {
    // 	return Object.freeze(newState);
    // } else {
    // 	return newState;
    // }
});
exports.default = reducer;
