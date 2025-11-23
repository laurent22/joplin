"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../../../BaseModel");
const eventManager_1 = require("../../../eventManager");
const Setting_1 = require("../../../models/Setting");
const makeListener_1 = require("../utils/makeListener");
/**
 * @ignore
 */
const Note_1 = require("../../../models/Note");
/**
 * @ignore
 */
const Folder_1 = require("../../../models/Folder");
var ItemChangeEventType;
(function (ItemChangeEventType) {
    ItemChangeEventType[ItemChangeEventType["Create"] = 1] = "Create";
    ItemChangeEventType[ItemChangeEventType["Update"] = 2] = "Update";
    ItemChangeEventType[ItemChangeEventType["Delete"] = 3] = "Delete";
})(ItemChangeEventType || (ItemChangeEventType = {}));
/**
 * The workspace service provides access to all the parts of Joplin that
 * are being worked on - i.e. the currently selected notes or notebooks as
 * well as various related events, such as when a new note is selected, or
 * when the note content changes.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
 */
class JoplinWorkspace {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(plugin, store) {
        this.store = store;
        this.plugin = plugin;
    }
    /**
     * Called when a new note or notes are selected.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    async onNoteSelectionChange(callback) {
        eventManager_1.default.appStateOn('selectedNoteIds', callback);
        const dispose = () => {
            eventManager_1.default.appStateOff('selectedNoteIds', callback);
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
    async onNoteContentChange(callback) {
        eventManager_1.default.on(eventManager_1.EventName.NoteContentChange, callback);
        const dispose = () => {
            eventManager_1.default.off(eventManager_1.EventName.NoteContentChange, callback);
        };
        this.plugin.addOnUnloadListener(dispose);
    }
    /**
     * Called when the content of the current note changes.
     */
    async onNoteChange(handler) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const wrapperHandler = (event) => {
            if (event.itemType !== BaseModel_1.ModelType.Note)
                return;
            if (!this.store.getState().selectedNoteIds.includes(event.itemId))
                return;
            handler({
                id: event.itemId,
                event: event.eventType,
            });
        };
        return (0, makeListener_1.default)(this.plugin, eventManager_1.default, eventManager_1.EventName.ItemChange, wrapperHandler);
    }
    /**
     * Called when a resource is changed. Currently this handled will not be
     * called when a resource is added or deleted.
     */
    async onResourceChange(handler) {
        (0, makeListener_1.default)(this.plugin, eventManager_1.default, eventManager_1.EventName.ResourceChange, handler);
    }
    /**
     * Called when an alarm associated with a to-do is triggered.
     */
    async onNoteAlarmTrigger(handler) {
        return (0, makeListener_1.default)(this.plugin, eventManager_1.default, eventManager_1.EventName.NoteAlarmTrigger, handler);
    }
    /**
     * Called when the synchronisation process is starting.
     */
    async onSyncStart(handler) {
        return (0, makeListener_1.default)(this.plugin, eventManager_1.default, eventManager_1.EventName.SyncStart, handler);
    }
    /**
     * Called when the synchronisation process has finished.
     */
    async onSyncComplete(callback) {
        return (0, makeListener_1.default)(this.plugin, eventManager_1.default, eventManager_1.EventName.SyncComplete, callback);
    }
    /**
     * Called just before the editor context menu is about to open. Allows
     * adding items to it.
     *
     * <span class="platform-desktop">desktop</span>
     */
    filterEditorContextMenu(handler) {
        eventManager_1.default.filterOn('editorContextMenu', handler);
        this.plugin.addOnUnloadListener(() => {
            eventManager_1.default.filterOff('editorContextMenu', handler);
        });
    }
    /**
     * Gets the currently selected note. Will be `null` if no note is selected.
     *
     * On desktop, this returns the selected note in the focused window.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async selectedNote() {
        const noteIds = this.store.getState().selectedNoteIds;
        if (noteIds.length !== 1) {
            return null;
        }
        return Note_1.default.load(noteIds[0]);
    }
    /**
     * Gets the currently selected folder. In some cases, for example during
     * search or when viewing a tag, no folder is actually selected in the user
     * interface. In that case, that function would return the last selected
     * folder.
     */
    async selectedFolder() {
        const folderId = Setting_1.default.value('activeFolderId');
        return folderId ? await Folder_1.default.load(folderId) : null;
    }
    /**
     * Gets the IDs of the selected notes (can be zero, one, or many). Use the data API to retrieve information about these notes.
     */
    async selectedNoteIds() {
        return this.store.getState().selectedNoteIds.slice();
    }
    /**
     * Gets the last hash (note section ID) from cross-note link targeting specific section.
     * New hash is available after `onNoteSelectionChange()` is triggered.
     * Example of cross-note link where `hello-world` is a hash: [Other Note Title](:/9bc9a5cb83f04554bf3fd3e41b4bb415#hello-world).
     * Method returns empty value when a note was navigated with method other than cross-note link containing valid hash.
     */
    async selectedNoteHash() {
        return this.store.getState().selectedNoteHash;
    }
}
exports.default = JoplinWorkspace;
