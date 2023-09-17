import Plugin from '../Plugin';
import { ViewHandle } from './types';
/**
 * Allows creating and managing view panels. View panels currently are
 * displayed at the right of the sidebar and allows displaying any HTML
 * content (within a webview) and update it in real-time. For example it
 * could be used to display a table of content for the active note, or
 * display various metadata or graph.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/toc)
 */
export default class JoplinViewsPanels {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: any);
    private controller;
    /**
     * Creates a new panel
     */
    create(id: string): Promise<ViewHandle>;
    /**
     * Sets the panel webview HTML
     */
    setHtml(handle: ViewHandle, html: string): Promise<string>;
    /**
     * Adds and loads a new JS or CSS files into the panel.
     */
    addScript(handle: ViewHandle, scriptPath: string): Promise<void>;
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
    onMessage(handle: ViewHandle, callback: Function): Promise<void>;
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
    postMessage(handle: ViewHandle, message: any): void;
    /**
     * Shows the panel
     */
    show(handle: ViewHandle, show?: boolean): Promise<void>;
    /**
     * Hides the panel
     */
    hide(handle: ViewHandle): Promise<void>;
    /**
     * Tells whether the panel is visible or not
     */
    visible(handle: ViewHandle): Promise<boolean>;
}
