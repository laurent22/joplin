/* eslint-disable multiline-comment-style */

import eventManager from '../../../eventManager';
import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';
import WebviewController, { ContainerType } from '../WebviewController';
import { ActivationCheckCallback, EditorActivationCheckFilterObject, FilterHandler, ViewHandle, UpdateCallback } from './types';

/**
 * Allows creating alternative note editors. You can create a view to handle loading and saving the
 * note, and do your own rendering.
 *
 * Although it may be used to implement an alternative text editor, the more common use case may be
 * to render the note in a different, graphical way - for example displaying a graph, and
 * saving/loading the graph data in the associated note. In that case, you would detect whether the
 * current note contains graph data and, in this case, you'd display your viewer.
 *
 * Terminology: An editor is **active** when it can be used to edit the current note. Note that it
 * doesn't necessarily mean that your editor is visible - it just means that the user has the option
 * to switch to it (via the "toggle editor" button). A **visible** editor is active and is currently
 * being displayed.
 *
 * To implement an editor you need to listen to two events:
 *
 * - `onActivationCheck`: This is a way for the app to know whether your editor should be active or
 *   not. Return `true` from this handler to activate your editor.
 *
 * - `onUpdate`: When this is called you should update your editor based on the current note
 *   content. Call `joplin.workspace.selectedNote()` to get the current note.
 *
 * - `showEditorPlugin` and `toggleEditorPlugin` commands. Additionally you can use these commands
 *   to display your editor via `joplin.commands.execute('showEditorPlugin')`. This is not always
 *   necessary since the user can switch to your editor using the "toggle editor" button, however
 *   you may want to programmatically display the editor in some cases - for example when creating a
 *   new note specific to your editor.
 *
 * Note that only one editor view can be active at a time. This is why it is important not to
 * activate your view if it's not relevant to the current note. If more than one is active, it is
 * undefined which editor is going to be used to display the note.
 *
 * For an example of editor plugin, see the [YesYouKan
 * plugin](https://github.com/joplin/plugin-yesyoukan/blob/master/src/index.ts). In particular,
 * check the logic around `onActivationCheck` and `onUpdate` since this is the entry points for
 * using this API.
 */
export default class JoplinViewsEditors {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store: any;
	private plugin: Plugin;
	private activationCheckHandlers_: Record<string, FilterHandler<EditorActivationCheckFilterObject>> = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private controller(handle: ViewHandle): WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	/**
	 * Creates a new editor view
	 */
	public async create(id: string): Promise<ViewHandle> {
		const handle = createViewHandle(this.plugin, id);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir, ContainerType.Editor);
		this.plugin.addViewController(controller);
		return handle;
	}

	/**
	 * Sets the editor HTML content
	 */
	public async setHtml(handle: ViewHandle, html: string): Promise<string> {
		return this.controller(handle).html = html;
	}

	/**
	 * Adds and loads a new JS or CSS file into the panel.
	 */
	public async addScript(handle: ViewHandle, scriptPath: string): Promise<void> {
		return this.controller(handle).addScript(scriptPath);
	}

	/**
	 * See [[JoplinViewPanels]]
	 */
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public async onMessage(handle: ViewHandle, callback: Function): Promise<void> {
		return this.controller(handle).onMessage(callback);
	}

	/**
	 * Emitted when the editor can potentially be activated - this is for example when the current
	 * note is changed, or when the application is opened. At that point you should check the
	 * current note and decide whether your editor should be activated or not. If it should, return
	 * `true`, otherwise return `false`.
	 */
	public async onActivationCheck(handle: ViewHandle, callback: ActivationCheckCallback): Promise<void> {
		const handler: FilterHandler<EditorActivationCheckFilterObject> = async (object) => {
			const isActive = await callback();
			object.activatedEditors.push({
				pluginId: this.plugin.id,
				viewId: handle,
				isActive: isActive,
			});
			return object;
		};

		this.activationCheckHandlers_[handle] = handler;

		eventManager.filterOn('editorActivationCheck', this.activationCheckHandlers_[handle]);
		this.plugin.addOnUnloadListener(() => {
			eventManager.filterOff('editorActivationCheck', this.activationCheckHandlers_[handle]);
		});
	}

	/**
	 * Emitted when your editor content should be updated. This is for example when the currently
	 * selected note changes, or when the user makes the editor visible.
	 */
	public async onUpdate(handle: ViewHandle, callback: UpdateCallback): Promise<void> {
		this.controller(handle).onUpdate(callback);
	}

	/**
	 * See [[JoplinViewPanels]]
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public postMessage(handle: ViewHandle, message: any): void {
		return this.controller(handle).postMessage(message);
	}

	/**
	 * Tells whether the editor is active or not.
	 */
	public async isActive(handle: ViewHandle): Promise<boolean> {
		return this.controller(handle).visible;
	}

	/**
	 * Tells whether the editor is effectively visible or not. If the editor is inactive, this will
	 * return `false`. If the editor is active and the user has switched to it, it will return
	 * `true`. Otherwise it will return `false`.
	 */
	public async isVisible(handle: ViewHandle): Promise<boolean> {
		return this.controller(handle).isVisible();
	}

}
