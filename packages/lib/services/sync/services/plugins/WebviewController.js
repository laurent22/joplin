"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerType = void 0;
const ViewController_1 = require("./ViewController");
const shim_1 = require("../../shim");
const { toSystemSlashes } = require('../../path-utils');
const PostMessageService_1 = require("../PostMessageService");
const reducer_1 = require("../../reducer");
const Logger_1 = require("@joplin/utils/Logger");
const logger = Logger_1.default.create('WebviewController');
var ContainerType;
(function (ContainerType) {
    ContainerType["Panel"] = "panel";
    ContainerType["Dialog"] = "dialog";
    ContainerType["Editor"] = "editor";
})(ContainerType || (exports.ContainerType = ContainerType = {}));
// TODO: Copied from:
// packages/app-desktop/gui/ResizableLayout/utils/findItemByKey.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function findItemByKey(layout, key) {
    if (!layout)
        throw new Error('Layout cannot be null');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    function recurseFind(item) {
        if (item.key === key)
            return item;
        if (item.children) {
            for (const child of item.children) {
                const found = recurseFind(child);
                if (found)
                    return found;
            }
        }
        return null;
    }
    return recurseFind(layout);
}
class WebviewController extends ViewController_1.default {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(handle, pluginId, store, baseDir, containerType, parentWindowId) {
        super(handle, pluginId, store);
        // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
        this.messageListener_ = null;
        this.updateListener_ = null;
        this.closeResponse_ = null;
        this.containerType_ = null;
        this.saveNoteListener_ = null;
        this.baseDir_ = toSystemSlashes(baseDir, 'linux');
        this.containerType_ = containerType;
        const view = {
            id: this.handle,
            editorTypeId: '',
            type: this.type,
            containerType: containerType,
            html: '',
            scripts: [],
            buttons: null,
            fitToContent: true,
            // Opened is used for dialogs and mobile panels (which are shown
            // like dialogs):
            opened: containerType === ContainerType.Panel,
            active: false,
            parentWindowId,
        };
        this.store.dispatch({
            type: 'PLUGIN_VIEW_ADD',
            pluginId: pluginId,
            view,
        });
    }
    destroy() {
        this.store.dispatch({
            type: 'PLUGIN_VIEW_REMOVE',
            pluginId: this.pluginId,
            viewId: this.storeView.id,
        });
    }
    get type() {
        return 'webview';
    }
    // Returns `null` if the view can be shown in any window.
    get parentWindowId() {
        return this.storeView.parentWindowId;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    setStoreProp(name, value) {
        this.store.dispatch({
            type: 'PLUGIN_VIEW_PROP_SET',
            pluginId: this.pluginId,
            id: this.handle,
            name: name,
            value: value,
        });
    }
    get html() {
        return this.storeView.html;
    }
    set html(html) {
        this.setStoreProp('html', html);
    }
    get containerType() {
        return this.storeView.containerType;
    }
    async addScript(path) {
        const fullPath = toSystemSlashes(shim_1.default.fsDriver().resolve(`${this.baseDir_}/${path}`), 'linux');
        if (fullPath.indexOf(this.baseDir_) !== 0)
            throw new Error(`Script appears to be outside of plugin base directory: ${fullPath} (Base dir: ${this.baseDir_})`);
        this.store.dispatch({
            type: 'PLUGIN_VIEW_PROP_PUSH',
            pluginId: this.pluginId,
            id: this.handle,
            name: 'scripts',
            value: fullPath,
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    postMessage(message) {
        const messageId = `plugin_${Date.now()}${Math.random()}`;
        void PostMessageService_1.default.instance().postMessage({
            pluginId: this.pluginId,
            viewId: this.handle,
            windowId: reducer_1.defaultWindowId,
            contentScriptId: null,
            from: PostMessageService_1.MessageParticipant.Plugin,
            to: PostMessageService_1.MessageParticipant.UserWebview,
            id: messageId,
            content: message,
        });
    }
    async emitMessage(event) {
        if (!this.messageListener_)
            return;
        return this.messageListener_(event.message);
    }
    emitUpdate(event) {
        if (!this.updateListener_)
            return;
        if (this.containerType_ === ContainerType.Editor && (!this.active || !this.visible)) {
            logger.info('emitMessage: Not emitting update because editor is disabled or hidden:', this.pluginId, this.handle, this.active, this.visible);
            return;
        }
        this.updateListener_(event);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    onMessage(callback) {
        this.messageListener_ = callback;
    }
    onUpdate(callback) {
        this.updateListener_ = callback;
    }
    get visible() {
        const appState = this.store.getState();
        if (this.containerType_ === ContainerType.Panel) {
            // Mobile: There is no appState.mainLayout
            if (!this.showWithAppLayout()) {
                return this.storeView.opened;
            }
            const mainLayout = appState.mainLayout;
            const item = findItemByKey(mainLayout, this.handle);
            return item ? item.visible : false;
        }
        else if (this.containerType_ === ContainerType.Editor) {
            const state = this.storeView;
            return state.active && state.opened;
        }
        else if (this.containerType_ === ContainerType.Dialog) {
            return this.storeView.opened;
        }
        const exhaustivenessCheck = this.containerType_;
        throw new Error(`Unknown container type: ${exhaustivenessCheck}`);
    }
    setOpen(show = true) {
        this.setStoreProp('opened', show);
        if (this.containerType_ === ContainerType.Panel) {
            if (this.showWithAppLayout()) {
                this.store.dispatch({
                    type: 'MAIN_LAYOUT_SET_ITEM_PROP',
                    itemKey: this.handle,
                    propName: 'visible',
                    propValue: show,
                });
            }
            return null;
        }
        else if (this.containerType_ === ContainerType.Dialog) {
            if (this.closeResponse_) {
                this.closeResponse_.resolve(null);
                this.closeResponse_ = null;
            }
            if (show) {
                this.store.dispatch({
                    type: 'VISIBLE_DIALOGS_ADD',
                    name: this.handle,
                });
                return new Promise((resolve, reject) => {
                    this.closeResponse_ = { resolve, reject };
                });
            }
            else {
                this.store.dispatch({
                    type: 'VISIBLE_DIALOGS_REMOVE',
                    name: this.handle,
                });
                return null;
            }
        }
        else if (this.containerType_ === ContainerType.Editor) {
            return null;
        }
        const exhaustivenessCheck = this.containerType_;
        throw new Error(`Unknown container type: ${exhaustivenessCheck}`);
    }
    async hide() {
        await this.setOpen(false);
    }
    // ---------------------------------------------
    // Specific to panels
    // ---------------------------------------------
    showWithAppLayout() {
        return this.containerType === ContainerType.Panel && !!this.store.getState().mainLayout;
    }
    // ---------------------------------------------
    // Specific to dialogs
    // ---------------------------------------------
    close() {
        void this.setOpen(false);
    }
    closeWithResponse(result) {
        const responseCallback = this.closeResponse_;
        // Clear the closeResponse_ to prevent the default behavior
        // (which sends a response of null).
        this.closeResponse_ = null;
        this.close();
        responseCallback === null || responseCallback === void 0 ? void 0 : responseCallback.resolve(result);
    }
    get buttons() {
        return this.storeView.buttons;
    }
    set buttons(buttons) {
        this.setStoreProp('buttons', buttons);
    }
    get fitToContent() {
        return this.storeView.fitToContent;
    }
    set fitToContent(fitToContent) {
        this.setStoreProp('fitToContent', fitToContent);
    }
    // ---------------------------------------------
    // Specific to editors
    // ---------------------------------------------
    setEditorTypeId(id) {
        this.setStoreProp('editorTypeId', id);
    }
    setActive(active) {
        this.setStoreProp('active', active);
    }
    get active() {
        // For compatibility with older versions of Joplin
        if (this.containerType_ !== ContainerType.Editor) {
            return this.visible;
        }
        const state = this.storeView;
        return state.active;
    }
    async requestSaveNote(event) {
        var _a;
        if (!this.saveNoteListener_) {
            logger.warn('Note save requested, but no save handler was registered. View ID: ', (_a = this.storeView) === null || _a === void 0 ? void 0 : _a.id);
            return;
        }
        this.saveNoteListener_(event);
    }
    onNoteSaveRequested(listener) {
        this.saveNoteListener_ = listener;
    }
}
exports.default = WebviewController;
