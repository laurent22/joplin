/* eslint-disable multiline-comment-style */

import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
import { ButtonSpec, ViewHandle, DialogResult, Toast } from './types';
import { _ } from '../../../locale';
import { JoplinViewsDialogs as JoplinViewsDialogsImplementation } from '../BasePlatformImplementation';

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
export default class JoplinViewsDialogs {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store: any;
	private plugin: Plugin;
	private implementation_: JoplinViewsDialogsImplementation;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(implementation: any, plugin: Plugin, store: any) {
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
	public async create(id: string): Promise<ViewHandle> {
		if (!id) {
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.dialogs.create("my-unique-id")`', true);
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
	public async showMessageBox(message: string): Promise<number> {
		return this.implementation_.showMessageBox(`${_('(In plugin: %s)', this.plugin.manifest.name)}\n\n${message}`);
	}

	/**
	 * Displays a Toast notification in the corner of the application screen.
	 */
	public async showToast(toast: Toast) {
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
	public async showOpenDialog(options: any): Promise<any> {
		return this.implementation_.showOpenDialog(options);
	}

	/**
	 * Sets the dialog HTML content
	 */
	public async setHtml(handle: ViewHandle, html: string) {
		return this.controller(handle).html = html;
	}

	/**
	 * Adds and loads a new JS or CSS files into the dialog.
	 */
	public async addScript(handle: ViewHandle, scriptPath: string) {
		return this.controller(handle).addScript(scriptPath);
	}

	/**
	 * Sets the dialog buttons.
	 */
	public async setButtons(handle: ViewHandle, buttons: ButtonSpec[]) {
		return this.controller(handle).buttons = buttons;
	}

	/**
	 * Opens the dialog.
	 *
	 * On desktop, this closes any copies of the dialog open in different windows.
	 */
	public async open(handle: ViewHandle): Promise<DialogResult> {
		return this.controller(handle).open();
	}

	/**
	 * Toggle on whether to fit the dialog size to the content or not.
	 * When set to false, the dialog is set to 90vw and 80vh
	 * @default true
	 */
	public async setFitToContent(handle: ViewHandle, status: boolean) {
		return this.controller(handle).fitToContent = status;
	}
}
