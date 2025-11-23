"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = stateToWhenClauseContext;
const reducer_1 = require("../../reducer");
const BaseModel_1 = require("../../BaseModel");
const Folder_1 = require("../../models/Folder");
const MarkupToHtml_1 = require("@joplin/renderer/MarkupToHtml");
const reducer_2 = require("../share/reducer");
const readOnly_1 = require("../../models/utils/readOnly");
const ItemChange_1 = require("../../models/ItemChange");
const trash_1 = require("../trash");
const getActivePluginEditorView_1 = require("../plugins/utils/getActivePluginEditorView");
function stateToWhenClauseContext(state, options = null) {
    var _a;
    options = Object.assign({ commandFolderId: '', commandNoteId: '' }, options);
    const windowState = options.windowId ? reducer_1.stateUtils.windowStateById(state, options.windowId) : state;
    const selectedNoteIds = windowState.selectedNoteIds || [];
    const selectedNoteId = selectedNoteIds.length === 1 ? selectedNoteIds[0] : null;
    const selectedNote = selectedNoteId ? BaseModel_1.default.byId(windowState.notes, selectedNoteId) : null;
    const selectedNotes = BaseModel_1.default.modelsByIds((_a = windowState.notes) !== null && _a !== void 0 ? _a : [], selectedNoteIds);
    const commandFolderId = state.notesParentType === 'Folder' ? (options.commandFolderId || windowState.selectedFolderId) : '';
    const commandFolder = commandFolderId ? BaseModel_1.default.byId(state.folders, commandFolderId) : null;
    const { editorPlugin } = state.pluginService ? (0, getActivePluginEditorView_1.default)(state.pluginService.plugins, windowState.windowId) : { editorPlugin: null };
    const settings = state.settings || {};
    return {
        // Application state
        notesAreBeingSaved: reducer_1.stateUtils.hasNotesBeingSaved(state),
        syncStarted: state.syncStarted,
        // Current location
        inConflictFolder: windowState.selectedFolderId === Folder_1.default.conflictFolderId(),
        inTrash: !!((windowState.selectedFolderId === (0, trash_1.getTrashFolderId)() && !!(selectedNote === null || selectedNote === void 0 ? void 0 : selectedNote.deleted_time)) || commandFolder && !!commandFolder.deleted_time),
        // Note selection
        oneNoteSelected: !!selectedNote,
        someNotesSelected: selectedNoteIds.length > 0,
        multipleNotesSelected: selectedNoteIds.length > 1,
        noNotesSelected: !selectedNoteIds.length,
        // Selected notes properties
        allSelectedNotesAreDeleted: !selectedNotes.find(n => !n.deleted_time),
        // Note history
        historyhasBackwardNotes: windowState.backwardHistoryNotes && windowState.backwardHistoryNotes.length > 0,
        historyhasForwardNotes: windowState.forwardHistoryNotes && windowState.forwardHistoryNotes.length > 0,
        // Folder selection
        oneFolderSelected: !!windowState.selectedFolderId,
        // Current note properties
        noteIsTodo: selectedNote ? !!selectedNote.is_todo : false,
        noteTodoCompleted: selectedNote ? !!selectedNote.todo_completed : false,
        noteIsMarkdown: selectedNote ? selectedNote.markup_language === MarkupToHtml_1.default.MARKUP_LANGUAGE_MARKDOWN : false,
        noteIsHtml: selectedNote ? selectedNote.markup_language === MarkupToHtml_1.default.MARKUP_LANGUAGE_HTML : false,
        noteIsReadOnly: selectedNote ? (0, readOnly_1.itemIsReadOnlySync)(BaseModel_1.ModelType.Note, ItemChange_1.default.SOURCE_UNSPECIFIED, selectedNote, settings['sync.userId'], state.shareService) : false,
        noteIsDeleted: selectedNote ? !!selectedNote.deleted_time : false,
        // Current context folder
        folderIsShareRoot: commandFolder ? (0, reducer_2.isRootSharedFolder)(commandFolder) : false,
        folderIsShareRootAndNotOwnedByUser: commandFolder ? (0, reducer_2.isRootSharedFolder)(commandFolder) && !(0, reducer_2.isSharedFolderOwner)(state, commandFolder.id) : false,
        folderIsShareRootAndOwnedByUser: commandFolder ? (0, reducer_2.isRootSharedFolder)(commandFolder) && (0, reducer_2.isSharedFolderOwner)(state, commandFolder.id) : false,
        folderIsShared: commandFolder ? !!commandFolder.share_id : false,
        folderIsDeleted: commandFolder ? !!commandFolder.deleted_time : false,
        folderIsTrash: commandFolder ? commandFolder.id === (0, trash_1.getTrashFolderId)() : false,
        folderIsReadOnly: commandFolder ? (0, readOnly_1.itemIsReadOnlySync)(BaseModel_1.ModelType.Folder, ItemChange_1.default.SOURCE_UNSPECIFIED, commandFolder, settings['sync.userId'], state.shareService) : false,
        joplinServerConnected: [9, 10, 11].includes(settings['sync.target']),
        joplinCloudAccountType: settings['sync.target'] === 10 ? settings['sync.10.accountType'] : 0,
        hasMultiProfiles: state.profileConfig && state.profileConfig.profiles.length > 1,
        hasActivePluginEditor: !!editorPlugin,
    };
}
