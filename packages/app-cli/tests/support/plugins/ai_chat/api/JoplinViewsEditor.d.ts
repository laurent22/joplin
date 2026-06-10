import Plugin from '../Plugin';
import { ActivationCheckCallback, ViewHandle, UpdateCallback } from './types';
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
    private store;
    private plugin;
    private activationCheckHandlers_;
    constructor(plugin: Plugin, store: any);
    private controller;
    /**
     * Creates a new editor view
     */
    create(id: string): Promise<ViewHandle>;
    /**
     * Sets the editor HTML content
     */
    setHtml(handle: ViewHandle, html: string): Promise<string>;
    /**
     * Adds and loads a new JS or CSS file into the panel.
     */
    addScript(handle: ViewHandle, scriptPath: string): Promise<void>;
    /**
     * See [[JoplinViewPanels]]
     */
    onMessage(handle: ViewHandle, callback: Function): Promise<void>;
    /**
     * Emitted when the editor can potentially be activated - this for example when the current note
     * is changed, or when the application is opened. At that point should can check the current
     * note and decide whether your editor should be activated or not. If it should return `true`,
     * otherwise return `false`.
     */
    onActivationCheck(handle: ViewHandle, callback: ActivationCheckCallback): Promise<void>;
    /**
     * Emitted when the editor content should be updated. This for example when the currently
     * selected note changes, or when the user makes the editor visible.
     */
    onUpdate(handle: ViewHandle, callback: UpdateCallback): Promise<void>;
    /**
     * See [[JoplinViewPanels]]
     */
    postMessage(handle: ViewHandle, message: any): void;
    /**
     * Tells whether the editor is active or not.
     */
    isActive(handle: ViewHandle): Promise<boolean>;
    /**
     * Tells whether the editor is effectively visible or not. If the editor is inactive, this will
     * return `false`. If the editor is active and the user has switched to it, it will return
     * `true`. Otherwise it will return `false`.
     */
    isVisible(handle: ViewHandle): Promise<boolean>;
}
