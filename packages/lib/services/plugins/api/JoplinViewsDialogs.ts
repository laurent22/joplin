import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
import { ButtonSpec, ViewHandle, ButtonId } from './types';

/**
 * Allows creating and managing dialogs. A dialog is modal window that contains a webview and a row of buttons. You can update the update the webview using the `setHtml` method.
 * Dialogs are hidden by default and you need to call `open()` to open them. Once the user clicks on a button, the `open` call will return and provide the button ID that was
 * clicked on. There is currently no "close" method since the dialog should be thought as a modal one and thus can only be closed by clicking on one of the buttons.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/dialog)
 */
export default class JoplinViewsDialogs {

	private store: any;
	private plugin: Plugin;
	private implementation_: any;

	constructor(implementation: any, plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
		this.implementation_ = implementation;
	}

	private controller(handle: ViewHandle): WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	/**
	 * Creates a new dialog
	 */
	async create(id: string): Promise<ViewHandle> {
		if (!id) {
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.dialogs.create("my-unique-id")`');
			id = `${this.plugin.viewCount}`;
		}

		const handle = createViewHandle(this.plugin, id);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir, ContainerType.Dialog);
		this.plugin.addViewController(controller);
		return handle;
	}

	/**
	 * Displays a message box with OK/Cancel buttons. Returns the button index that was clicked - "0" for OK and "1" for "Cancel"
	 */
	async showMessageBox(message: string): Promise<number> {
		return this.implementation_.showMessageBox(message);
	}

	/**
	 * Sets the dialog HTML content
	 */
	async setHtml(handle: ViewHandle, html: string) {
		return this.controller(handle).html = html;
	}

	/**
	 * Sets the dialog buttons.
	 */
	async setButtons(handle: ViewHandle, buttons: ButtonSpec[]) {
		return this.controller(handle).buttons = buttons;
	}

	/**
	 * Opens the dialog
	 */
	async open(handle: ViewHandle): Promise<ButtonId> {
		return this.controller(handle).open();
	}

}
