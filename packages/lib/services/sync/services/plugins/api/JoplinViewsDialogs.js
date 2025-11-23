"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const createViewHandle_1 = require("../utils/createViewHandle");
const WebviewController_1 = require("../WebviewController");
const locale_1 = require("../../../locale");
/**
 * Allows creating and managing dialogs. A dialog is modal window that
 * contains a webview and a row of buttons. You can update the
 * webview using the `setHtml` method. Dialogs are hidden by default and
 * you need to call `open()` to open them. Once the user clicks on a
 * button, the `open` call will return an object indicating what button was
 * clicked on.
 *
 * ## Retrieving form values
 *
 * If your HTML content included one or more forms, a `formData` object
 * will also be included with the key/value for each form.
 *
 * ## Special button IDs
 *
 * The following buttons IDs have a special meaning:
 *
 * - `ok`, `yes`, `submit`, `confirm`: They are considered "submit" buttons
 * - `cancel`, `no`, `reject`: They are considered "dismiss" buttons
 *
 * This information is used by the application to determine what action
 * should be done when the user presses "Enter" or "Escape" within the
 * dialog. If they press "Enter", the first "submit" button will be
 * automatically clicked. If they press "Escape" the first "dismiss" button
 * will be automatically clicked.
 *
 * [View the demo
 * plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/dialog)
 */
class JoplinViewsDialogs {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(implementation, plugin, store) {
        this.store = store;
        this.plugin = plugin;
        this.implementation_ = implementation;
    }
    controller(handle) {
        return this.plugin.viewController(handle);
    }
    /**
     * Creates a new dialog
     */
    async create(id) {
        if (!id) {
            this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.dialogs.create("my-unique-id")`', true);
            id = `${this.plugin.viewCount}`;
        }
        const handle = (0, createViewHandle_1.default)(this.plugin, id);
        const controller = new WebviewController_1.default(handle, this.plugin.id, this.store, this.plugin.baseDir, WebviewController_1.ContainerType.Dialog, null);
        this.plugin.addViewController(controller);
        return handle;
    }
    /**
     * Displays a message box with OK/Cancel buttons. Returns the button index that was clicked - "0" for OK and "1" for "Cancel"
     */
    async showMessageBox(message) {
        return this.implementation_.showMessageBox(`${(0, locale_1._)('(In plugin: %s)', this.plugin.manifest.name)}\n\n${message}`);
    }
    /**
     * Displays a Toast notification in the corner of the application screen.
     */
    async showToast(toast) {
        this.store.dispatch({
            type: 'TOAST_SHOW',
            value: toast,
        });
    }
    /**
     * Displays a dialog to select a file or a directory. Same options and
     * output as
     * https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options
     *
     * <span class="platform-desktop">desktop</span>
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async showOpenDialog(options) {
        return this.implementation_.showOpenDialog(options);
    }
    /**
     * Sets the dialog HTML content
     */
    async setHtml(handle, html) {
        return this.controller(handle).html = html;
    }
    /**
     * Adds and loads a new JS or CSS files into the dialog.
     */
    async addScript(handle, scriptPath) {
        return this.controller(handle).addScript(scriptPath);
    }
    /**
     * Sets the dialog buttons.
     */
    async setButtons(handle, buttons) {
        return this.controller(handle).buttons = buttons;
    }
    /**
     * Opens the dialog.
     *
     * On desktop, this closes any copies of the dialog open in different windows.
     */
    async open(handle) {
        return this.controller(handle).setOpen(true);
    }
    /**
     * Toggle on whether to fit the dialog size to the content or not.
     * When set to false, the dialog is set to 90vw and 80vh
     * @default true
     */
    async setFitToContent(handle, status) {
        return this.controller(handle).fitToContent = status;
    }
}
exports.default = JoplinViewsDialogs;
