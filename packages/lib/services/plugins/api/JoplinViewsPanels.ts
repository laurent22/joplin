import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController from '../WebviewController';
import { ViewHandle } from './types';

/**
 * Allows creating and managing view panels. View panels currently are displayed at the right of the sidebar and allows displaying any HTML content (within a webview) and update it in real-time. For example
 * it could be used to display a table of content for the active note, or display various metadata or graph.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/toc)
 */
export default class JoplinViewsPanels {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private controller(handle: ViewHandle): WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	/**
	 * Creates a new panel
	 */
	async create(): Promise<ViewHandle> {
		const handle = createViewHandle(this.plugin);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir);
		this.plugin.addViewController(controller);
		return handle;
	}

	/**
	 * Sets the panel webview HTML
	 */
	async setHtml(handle: ViewHandle, html: string) {
		return this.controller(handle).html = html;
	}

	/**
	 * Adds and loads a new JS or CSS files into the panel.
	 */
	async addScript(handle: ViewHandle, scriptPath: string) {
		return this.controller(handle).addScript(scriptPath);
	}

	/**
	 * Called when a message is sent from the webview (using postMessage).
	 */
	async onMessage(handle: ViewHandle, callback: Function) {
		return this.controller(handle).onMessage(callback);
	}

}
