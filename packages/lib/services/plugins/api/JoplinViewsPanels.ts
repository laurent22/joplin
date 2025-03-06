/* eslint-disable multiline-comment-style */

import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
import { ViewHandle } from './types';

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
export default class JoplinViewsPanels {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store: any;
	private plugin: Plugin;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private controller(handle: ViewHandle): WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	/**
	 * Creates a new panel
	 */
	public async create(id: string): Promise<ViewHandle> {
		if (!id) {
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.panels.create("my-unique-id")`', true);
			id = `${this.plugin.viewCount}`;
		}

		const handle = createViewHandle(this.plugin, id);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir, ContainerType.Panel);
		this.plugin.addViewController(controller);
		return handle;
	}

	/**
	 * Sets the panel webview HTML
	 */
	public async setHtml(handle: ViewHandle, html: string): Promise<string> {
		return this.controller(handle).html = html;
	}

	/**
	 * Adds and loads a new JS or CSS files into the panel.
	 */
	public async addScript(handle: ViewHandle, scriptPath: string): Promise<void> {
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
	public async onMessage(handle: ViewHandle, callback: Function): Promise<void> {
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
	public postMessage(handle: ViewHandle, message: any): void {
		return this.controller(handle).postMessage(message);
	}

	/**
	 * Shows the panel
	 */
	public async show(handle: ViewHandle, show = true): Promise<void> {
		await this.controller(handle).show(show);
	}

	/**
	 * Hides the panel
	 */
	public async hide(handle: ViewHandle): Promise<void> {
		await this.show(handle, false);
	}

	/**
	 * Tells whether the panel is visible or not
	 */
	public async visible(handle: ViewHandle): Promise<boolean> {
		return this.controller(handle).visible;
	}

	public async isActive(handle: ViewHandle): Promise<boolean> {
		return this.controller(handle).isActive();
	}

}
