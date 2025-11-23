"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const reducer_1 = require("../../../reducer");
const createViewHandle_1 = require("../utils/createViewHandle");
const WebviewController_1 = require("../WebviewController");
/**
 * Allows creating and managing view panels. View panels allow displaying any HTML
 * content (within a webview) and updating it in real-time. For example it
 * could be used to display a table of content for the active note, or
 * display various metadata or graph.
 *
 * On desktop, view panels currently are displayed at the right of the sidebar, though can
 * be moved with "View" > "Change application layout".
 *
 * On mobile, view panels are shown in a tabbed dialog that can be opened using a
 * toolbar button.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/toc)
 */
class JoplinViewsPanels {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(plugin, store) {
        this.store = store;
        this.plugin = plugin;
    }
    controller(handle) {
        return this.plugin.viewController(handle);
    }
    /**
     * Creates a new panel
     */
    async create(id) {
        if (!id) {
            this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.panels.create("my-unique-id")`', true);
            id = `${this.plugin.viewCount}`;
        }
        const handle = (0, createViewHandle_1.default)(this.plugin, id);
        const controller = new WebviewController_1.default(handle, this.plugin.id, this.store, this.plugin.baseDir, WebviewController_1.ContainerType.Panel, reducer_1.defaultWindowId);
        this.plugin.addViewController(controller);
        return handle;
    }
    /**
     * Sets the panel webview HTML
     */
    async setHtml(handle, html) {
        return this.controller(handle).html = html;
    }
    /**
     * Adds and loads a new JS or CSS files into the panel.
     */
    async addScript(handle, scriptPath) {
        return this.controller(handle).addScript(scriptPath);
    }
    /**
     * Called when a message is sent from the webview (using postMessage).
     *
     * To post a message from the webview to the plugin use:
     *
     * ```javascript
     * const response = await webviewApi.postMessage(message);
     * ```
     *
     * - `message` can be any JavaScript object, string or number
     * - `response` is whatever was returned by the `onMessage` handler
     *
     * Using this mechanism, you can have two-way communication between the
     * plugin and webview.
     *
     * See the [postMessage
     * demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/post_messages) for more details.
     *
     */
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    async onMessage(handle, callback) {
        return this.controller(handle).onMessage(callback);
    }
    /**
     * Sends a message to the webview.
     *
     * The webview must have registered a message handler prior, otherwise the message is ignored. Use;
     *
     * ```javascript
     * webviewApi.onMessage((message) => { ... });
     * ```
     *
     *  - `message` can be any JavaScript object, string or number
     *
     * The view API may have only one onMessage handler defined.
     * This method is fire and forget so no response is returned.
     *
     * It is particularly useful when the webview needs to react to events emitted by the plugin or the joplin api.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    postMessage(handle, message) {
        return this.controller(handle).postMessage(message);
    }
    /**
     * Shows the panel
     */
    async show(handle, show = true) {
        await this.controller(handle).setOpen(show);
    }
    /**
     * Hides the panel
     */
    async hide(handle) {
        await this.show(handle, false);
    }
    /**
     * Tells whether the panel is visible or not
     */
    async visible(handle) {
        return this.controller(handle).visible;
    }
    /**
     * Assuming that the current panel is an editor plugin view, returns
     * whether the editor plugin view supports editing the current note.
     */
    async isActive(handle) {
        return this.controller(handle).active;
    }
}
exports.default = JoplinViewsPanels;
