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
     */
    onMessage(handle: ViewHandle, callback: Function): Promise<void>;
}
