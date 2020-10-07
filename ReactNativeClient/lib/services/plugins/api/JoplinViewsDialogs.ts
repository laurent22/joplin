import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
import { ButtonSpec, ViewHandle, ButtonId } from './types';

/**
 * Allows creating and managing dialogs. A dialog is modal window that contains a webview and a row of buttons. You can update the update the webview using the `setHtml` method.
 * Dialogs are hidden by default and you need to call `open()` to open them. Once the user clicks on a button, the `open` call will return and provide the button ID that was
 * clicked on. There is currently no "close" method since the dialog should be thought as a modal one and thus can only be closed by clicking on one of the buttons.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/CliClient/tests/support/plugins/dialog)
 */
export default class JoplinViewsDialogs {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private controller(handle:ViewHandle):WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	/**
	 * Creates a new dialog
	 */
	async create():Promise<ViewHandle> {
		const handle = createViewHandle(this.plugin);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir);
		controller.containerType = ContainerType.Dialog;
		this.plugin.addViewController(controller);
		return handle;
	}

	/**
	 * Sets the dialog HTML content
	 */
	async setHtml(handle:ViewHandle, html:string) {
		return this.controller(handle).html = html;
	}

	/**
	 * Sets the dialog buttons.
	 */
	async setButtons(handle:ViewHandle, buttons:ButtonSpec[]) {
		return this.controller(handle).buttons = buttons;
	}

	/**
	 * Opens the dialog
	 */
	async open(handle:ViewHandle):Promise<ButtonId> {
		return this.controller(handle).open();
	}

}
