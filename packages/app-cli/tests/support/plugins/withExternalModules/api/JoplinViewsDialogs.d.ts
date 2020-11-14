import Plugin from '../Plugin';
import { ButtonSpec, ViewHandle, DialogResult } from './types';
/**
 * Allows creating and managing dialogs. A dialog is modal window that contains a webview and a row of buttons. You can update the update the webview using the `setHtml` method.
 * Dialogs are hidden by default and you need to call `open()` to open them. Once the user clicks on a button, the `open` call will return an object indicating what button was clicked
 * on. If your HTML content included one or more form, a `formData` object will also be included with the key/value for each form.
 * There is currently no "close" method since the dialog should be thought as a modal one and thus can only be closed by clicking on one of the buttons.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/dialog)
 */
export default class JoplinViewsDialogs {
    private store;
    private plugin;
    private implementation_;
    constructor(implementation: any, plugin: Plugin, store: any);
    private controller;
    /**
     * Creates a new dialog
     */
    create(id: string): Promise<ViewHandle>;
    /**
     * Displays a message box with OK/Cancel buttons. Returns the button index that was clicked - "0" for OK and "1" for "Cancel"
     */
    showMessageBox(message: string): Promise<number>;
    /**
     * Sets the dialog HTML content
     */
    setHtml(handle: ViewHandle, html: string): Promise<string>;
    /**
     * Sets the dialog buttons.
     */
    setButtons(handle: ViewHandle, buttons: ButtonSpec[]): Promise<ButtonSpec[]>;
    /**
     * Opens the dialog
     */
    open(handle: ViewHandle): Promise<DialogResult>;
}
