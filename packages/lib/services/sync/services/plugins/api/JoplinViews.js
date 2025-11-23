"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const JoplinViewsDialogs_1 = require("./JoplinViewsDialogs");
const JoplinViewsMenuItems_1 = require("./JoplinViewsMenuItems");
const JoplinViewsMenus_1 = require("./JoplinViewsMenus");
const JoplinViewsToolbarButtons_1 = require("./JoplinViewsToolbarButtons");
const JoplinViewsPanels_1 = require("./JoplinViewsPanels");
const JoplinViewsNoteList_1 = require("./JoplinViewsNoteList");
const JoplinViewsEditor_1 = require("./JoplinViewsEditor");
/**
 * This namespace provides access to view-related services.
 *
 * ## Creating a view
 *
 * All view services provide a `create()` method which you would use to create the view object,
 * whether it's a dialog, a toolbar button or a menu item. In some cases, the `create()` method will
 * return a [[ViewHandle]], which you would use to act on the view, for example to set certain
 * properties or call some methods.
 *
 * ## The `webviewApi` object
 *
 * Within a view, you can use the global object `webviewApi` for various utility functions, such as
 * sending messages or displaying context menu. Refer to [[WebviewApi]] for the full documentation.
 */
class JoplinViews {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(implementation, plugin, store) {
        this.panels_ = null;
        this.menuItems_ = null;
        this.menus_ = null;
        this.toolbarButtons_ = null;
        this.dialogs_ = null;
        this.editors_ = null;
        this.noteList_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.implementation_ = null;
        this.store = store;
        this.plugin = plugin;
        this.implementation_ = implementation;
    }
    get dialogs() {
        if (!this.dialogs_)
            this.dialogs_ = new JoplinViewsDialogs_1.default(this.implementation_.dialogs, this.plugin, this.store);
        return this.dialogs_;
    }
    get panels() {
        if (!this.panels_)
            this.panels_ = new JoplinViewsPanels_1.default(this.plugin, this.store);
        return this.panels_;
    }
    get editors() {
        if (!this.editors_)
            this.editors_ = new JoplinViewsEditor_1.default(this.plugin, this.store);
        return this.editors_;
    }
    get menuItems() {
        if (!this.menuItems_)
            this.menuItems_ = new JoplinViewsMenuItems_1.default(this.plugin, this.store);
        return this.menuItems_;
    }
    get menus() {
        if (!this.menus_)
            this.menus_ = new JoplinViewsMenus_1.default(this.plugin, this.store);
        return this.menus_;
    }
    get toolbarButtons() {
        if (!this.toolbarButtons_)
            this.toolbarButtons_ = new JoplinViewsToolbarButtons_1.default(this.plugin, this.store);
        return this.toolbarButtons_;
    }
    get noteList() {
        if (!this.noteList_)
            this.noteList_ = new JoplinViewsNoteList_1.default(this.plugin, this.store);
        return this.noteList_;
    }
}
exports.default = JoplinViews;
