import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
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

	private store: any;
	private plugin: Plugin;

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
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.panels.create("my-unique-id")`');
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
	public async setHtml(handle: ViewHandle, html: string) {
		return this.controller(handle).html = html;
	}

	/**
	 * Adds and loads a new JS or CSS files into the panel.
	 */
	public async addScript(handle: ViewHandle, scriptPath: string) {
		return this.controller(handle).addScript(scriptPath);
	}

	/**
	 * Called when a message is sent from the webview (using postMessage).
	 */
	public async onMessage(handle: ViewHandle, callback: Function) {
		return this.controller(handle).onMessage(callback);
	}

	/**
	 * Shows the panel
	 */
	public async show(handle: ViewHandle, show: boolean = true): Promise<void> {
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

}
