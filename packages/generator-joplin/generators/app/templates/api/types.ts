/* eslint-disable multiline-comment-style */

// =================================================================
// Command API types
// =================================================================

export interface Command {
	/**
	 * Name of command - must be globally unique
	 */
	name: string;

	/**
	 * Label to be displayed on menu items or keyboard shortcut editor for example.
	 * If it is missing, it's assumed it's a private command, to be called programmatically only.
	 * In that case the command will not appear in the shortcut editor or command panel, and logically
	 * should not be used as a menu item.
	 */
	label?: string;

	/**
	 * Icon to be used on toolbar buttons for example
	 */
	iconName?: string;

	/**
	 * Code to be ran when the command is executed. It may return a result.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	execute(...args: any[]): Promise<any | void>;

	/**
	 * Defines whether the command should be enabled or disabled, which in turns
	 * affects the enabled state of any associated button or menu item.
	 *
	 * The condition should be expressed as a "when-clause" (as in Visual Studio
	 * Code). It's a simple boolean expression that evaluates to `true` or
	 * `false`. It supports the following operators:
	 *
	 * Operator | Symbol | Example
	 * -- | -- | --
	 * Equality | == | "editorType == markdown"
	 * Inequality | != | "currentScreen != config"
	 * Or | \|\| | "noteIsTodo \|\| noteTodoCompleted"
	 * And | && | "oneNoteSelected && !inConflictFolder"
	 *
	 * Joplin, unlike VSCode, also supports parentheses, which allows creating
	 * more complex expressions such as `cond1 || (cond2 && cond3)`. Only one
	 * level of parentheses is possible (nested ones aren't supported).
	 *
	 * Currently the supported context variables aren't documented, but you can
	 * find the list below:
	 *
	 * - [Global When Clauses](https://github.com/laurent22/joplin/blob/dev/packages/lib/services/commands/stateToWhenClauseContext.ts)
	 * - [Desktop app When Clauses](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/services/commands/stateToWhenClauseContext.ts)
	 *
	 * Note: Commands are enabled by default unless you use this property.
	 */
	enabledCondition?: string;
}

// =================================================================
// Interop API types
// =================================================================

export enum FileSystemItem {
	File = 'file',
	Directory = 'directory',
}

export enum ImportModuleOutputFormat {
	Markdown = 'md',
	Html = 'html',
}

/**
 * Used to implement a module to export data from Joplin. [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/json_export) for an example.
 *
 * In general, all the event handlers you'll need to implement take a `context` object as a first argument. This object will contain the export or import path as well as various optional properties, such as which notes or notebooks need to be exported.
 *
 * To get a better sense of what it will contain it can be useful to print it using `console.info(context)`.
 */
export interface ExportModule {
	/**
	 * The format to be exported, eg "enex", "jex", "json", etc.
	 */
	format: string;

	/**
	 * The description that will appear in the UI, for example in the menu item.
	 */
	description: string;

	/**
	 * Whether the module will export a single file or multiple files in a directory. It affects the open dialog that will be presented to the user when using your exporter.
	 */
	target: FileSystemItem;

	/**
	 * Only applies to single file exporters or importers
	 * It tells whether the format can package multiple notes into one file.
	 * For example JEX or ENEX can, but HTML cannot.
	 */
	isNoteArchive: boolean;

	/**
	 * The extensions of the files exported by your module. For example, it is `["htm", "html"]` for the HTML module, and just `["jex"]` for the JEX module.
	 */
	fileExtensions?: string[];

	/**
	 * Called when the export process starts.
	 */
	onInit(context: ExportContext): Promise<void>;

	/**
	 * Called when an item needs to be processed. An "item" can be any Joplin object, such as a note, a folder, a notebook, etc.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onProcessItem(context: ExportContext, itemType: number, item: any): Promise<void>;

	/**
	 * Called when a resource file needs to be exported.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onProcessResource(context: ExportContext, resource: any, filePath: string): Promise<void>;

	/**
	 * Called when the export process is done.
	 */
	onClose(context: ExportContext): Promise<void>;
}

export interface ImportModule {
	/**
	 * The format to be exported, eg "enex", "jex", "json", etc.
	 */
	format: string;

	/**
	 * The description that will appear in the UI, for example in the menu item.
	 */
	description: string;

	/**
	 * Only applies to single file exporters or importers
	 * It tells whether the format can package multiple notes into one file.
	 * For example JEX or ENEX can, but HTML cannot.
	 */
	isNoteArchive: boolean;

	/**
	 * The type of sources that are supported by the module. Tells whether the module can import files or directories or both.
	 */
	sources: FileSystemItem[];

	/**
	 * Tells the file extensions of the exported files.
	 */
	fileExtensions?: string[];

	/**
	 * Tells the type of notes that will be generated, either HTML or Markdown (default).
	 */
	outputFormat?: ImportModuleOutputFormat;

	/**
	 * Called when the import process starts. There is only one event handler within which you should import the complete data.
	 */
	onExec(context: ImportContext): Promise<void>;
}

export interface ExportOptions {
	format?: string;
	path?: string;
	sourceFolderIds?: string[];
	sourceNoteIds?: string[];
	// modulePath?: string;
	target?: FileSystemItem;
}

export interface ExportContext {
	destPath: string;
	options: ExportOptions;

	/**
	 * You can attach your own custom data using this property - it will then be passed to each event handler, allowing you to keep state from one event to the next.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	userData?: any;
}

export interface ImportContext {
	sourcePath: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	options: any;
	warnings: string[];
}

// =================================================================
// Misc types
// =================================================================

export interface Script {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onStart?(event: any): Promise<void>;
}

export interface Disposable {
	// dispose():void;
}

export enum ModelType {
	Note = 1,
	Folder = 2,
	Setting = 3,
	Resource = 4,
	Tag = 5,
	NoteTag = 6,
	Search = 7,
	Alarm = 8,
	MasterKey = 9,
	ItemChange = 10,
	NoteResource = 11,
	ResourceLocalState = 12,
	Revision = 13,
	Migration = 14,
	SmartFilter = 15,
	Command = 16,
}

export interface VersionInfo {
	version: string;
	profileVersion: number;
	syncVersion: number;

	platform: 'desktop'|'mobile';
}

// =================================================================
// Menu types
// =================================================================

export interface CreateMenuItemOptions {
	accelerator: string;
}

export enum MenuItemLocation {
	File = 'file',
	Edit = 'edit',
	View = 'view',
	Note = 'note',
	Tools = 'tools',
	Help = 'help',

	/**
	 * @deprecated Do not use - same as NoteListContextMenu
	 */
	Context = 'context',

	// If adding an item here, don't forget to update isContextMenuItemLocation()

	/**
	 * When a command is called from the note list context menu, the
	 * command will receive the following arguments:
	 *
	 * - `noteIds:string[]`: IDs of the notes that were right-clicked on.
	 */
	NoteListContextMenu = 'noteListContextMenu',

	EditorContextMenu = 'editorContextMenu',

	/**
	 * When a command is called from a folder context menu, the
	 * command will receive the following arguments:
	 *
	 * - `folderId:string`: ID of the folder that was right-clicked on
	 */
	FolderContextMenu = 'folderContextMenu',

	/**
	 * When a command is called from a tag context menu, the
	 * command will receive the following arguments:
	 *
	 * - `tagId:string`: ID of the tag that was right-clicked on
	 */
	TagContextMenu = 'tagContextMenu',
}

export function isContextMenuItemLocation(location: MenuItemLocation): boolean {
	return [
		MenuItemLocation.Context,
		MenuItemLocation.NoteListContextMenu,
		MenuItemLocation.EditorContextMenu,
		MenuItemLocation.FolderContextMenu,
		MenuItemLocation.TagContextMenu,
	].includes(location);
}

export interface MenuItem {
	/**
	 * Command that should be associated with the menu item. All menu item should
	 * have a command associated with them unless they are a sub-menu.
	 */
	commandName?: string;

	/**
	 * Arguments that should be passed to the command. They will be as rest
	 * parameters.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	commandArgs?: any[];

	/**
	 * Set to "separator" to create a divider line
	 */
	type?: ('normal' | 'separator' | 'submenu' | 'checkbox' | 'radio');

	/**
	 * Accelerator associated with the menu item
	 */
	accelerator?: string;

	/**
	 * Menu items that should appear below this menu item. Allows creating a menu tree.
	 */
	submenu?: MenuItem[];

	/**
	 * Menu item label. If not specified, the command label will be used instead.
	 */
	label?: string;
}

// =================================================================
// View API types
// =================================================================

export interface ButtonSpec {
	id: ButtonId;
	title?: string;
	onClick?(): void;
}

export type ButtonId = string;

export enum ToolbarButtonLocation {
	/**
	 * This toolbar in the top right corner of the application. It applies to the note as a whole, including its metadata.
	 *
	 * <span class="platform-desktop">desktop</span>
	 */
	NoteToolbar = 'noteToolbar',

	/**
	 * This toolbar is right above the text editor. It applies to the note body only.
	 */
	EditorToolbar = 'editorToolbar',
}

export type ViewHandle = string;

export interface EditorCommand {
	name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value?: any;
}

export interface DialogResult {
	id: ButtonId;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	formData?: any;
}

export enum ToastType {
	Info = 'info',
	Success = 'success',
	Error = 'error',
}

export interface Toast {
	message: string;
	type?: ToastType;
	duration?: number;
	timestamp?: number;
}

export interface Size {
	width?: number;
	height?: number;
}

export interface Rectangle {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}

export type ActivationCheckCallback = ()=> Promise<boolean>;

export type UpdateCallback = ()=> Promise<void>;

export type VisibleHandler = ()=> Promise<void>;

export interface EditContextMenuFilterObject {
	items: MenuItem[];
}

export interface EditorActivationCheckFilterObject {
	activatedEditors: {
		pluginId: string;
		viewId: string;
		isActive: boolean;
	}[];
}

export type FilterHandler<T> = (object: T)=> Promise<T>;

// =================================================================
// Settings types
// =================================================================

export enum SettingItemType {
	Int = 1,
	String = 2,
	Bool = 3,
	Array = 4,
	Object = 5,
	Button = 6,
}

export enum SettingItemSubType {
	FilePathAndArgs = 'file_path_and_args',
	FilePath = 'file_path', // Not supported on mobile!
	DirectoryPath = 'directory_path', // Not supported on mobile!
}

export enum AppType {
	Desktop = 'desktop',
	Mobile = 'mobile',
	Cli = 'cli',
}

export enum SettingStorage {
	Database = 1,
	File = 2,
}

// Redefine a simplified interface to mask internal details
// and to remove function calls as they would have to be async.
export interface SettingItem {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
	type: SettingItemType;

	/**
	 * Currently only used to display a file or directory selector. Always set
	 * `type` to `SettingItemType.String` when using this property.
	 */
	subType?: SettingItemSubType;

	label: string;
	description?: string;

	/**
	 * A public setting will appear in the Configuration screen and will be
	 * modifiable by the user. A private setting however will not appear there,
	 * and can only be changed programmatically. You may use this to store some
	 * values that you do not want to directly expose.
	 */
	public: boolean;

	/**
	 * You would usually set this to a section you would have created
	 * specifically for the plugin.
	 */
	section?: string;

	/**
	 * To create a setting with multiple options, set this property to `true`.
	 * That setting will render as a dropdown list in the configuration screen.
	 */
	isEnum?: boolean;

	/**
	 * This property is required when `isEnum` is `true`. In which case, it
	 * should contain a map of value => label.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	options?: Record<any, any>;

	/**
	 * Reserved property. Not used at the moment.
	 */
	appTypes?: AppType[];

	/**
	 * Set this to `true` to store secure data, such as passwords. Any such
	 * setting will be stored in the system keychain if one is available.
	 */
	secure?: boolean;

	/**
	 * An advanced setting will be moved under the "Advanced" button in the
	 * config screen.
	 */
	advanced?: boolean;

	/**
	 * Set the min, max and step values if you want to restrict an int setting
	 * to a particular range.
	 */
	minimum?: number;
	maximum?: number;
	step?: number;

	/**
	 * Either store the setting in the database or in settings.json. Defaults to database.
	 */
	storage?: SettingStorage;
}

export interface SettingSection {
	label: string;
	iconName?: string;
	description?: string;
	name?: string;
}

// =================================================================
// Data API types
// =================================================================

/**
 * An array of at least one element and at most three elements.
 *
 * - **[0]**: Resource name (eg. "notes", "folders", "tags", etc.)
 * - **[1]**: (Optional) Resource ID.
 * - **[2]**: (Optional) Resource link.
 */
export type Path = string[];

// =================================================================
// Content Script types
// =================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type PostMessageHandler = (message: any)=> Promise<any>;

/**
 * When a content script is initialised, it receives a `context` object.
 */
export interface ContentScriptContext {
	/**
	 * The plugin ID that registered this content script
	 */
	pluginId: string;

	/**
	 * The content script ID, which may be necessary to post messages
	 */
	contentScriptId: string;

	/**
	 * Can be used by CodeMirror content scripts to post a message to the plugin
	 */
	postMessage: PostMessageHandler;
}

export interface ContentScriptModuleLoadedEvent {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	userData?: any;
}

export interface ContentScriptModule {
	onLoaded?: (event: ContentScriptModuleLoadedEvent)=> void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	plugin: ()=> any;
	assets?: ()=> void;
}

export interface MarkdownItContentScriptModule extends Omit<ContentScriptModule, 'plugin'> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	plugin: (markdownIt: any, options: any)=> any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type EditorCommandCallback = (...args: any[])=> any;

export interface CodeMirrorControl {
	/** Points to a CodeMirror 6 EditorView instance. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	editor: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	cm6: any;

	/** `extension` should be a [CodeMirror 6 extension](https://codemirror.net/docs/ref/#state.Extension). */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	addExtension(extension: any|any[]): void;

	supportsCommand(name: string): boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	execCommand(name: string, ...args: any[]): any;
	registerCommand(name: string, callback: EditorCommandCallback): void;

	joplinExtensions: {
		/**
		 * Returns a [CodeMirror 6 extension](https://codemirror.net/docs/ref/#state.Extension) that
		 * registers the given [CompletionSource](https://codemirror.net/docs/ref/#autocomplete.CompletionSource).
		 *
		 * Use this extension rather than the built-in CodeMirror [`autocompletion`](https://codemirror.net/docs/ref/#autocomplete.autocompletion)
		 * if you don't want to use [languageData-based autocompletion](https://codemirror.net/docs/ref/#autocomplete.autocompletion^config.override).
		 *
		 * Using `autocompletion({ override: [ ... ]})` causes errors when done by multiple plugins.
		 */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		completionSource(completionSource: any): any;

		/**
		 * Creates an extension that enables or disables [`languageData`-based autocompletion](https://codemirror.net/docs/ref/#autocomplete.autocompletion^config.override).
		 */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		enableLanguageDataAutocomplete: { of: (enabled: boolean)=> any };

		/**
		 * A CodeMirror [facet](https://codemirror.net/docs/ref/#state.EditorState.facet) that contains
		 * the ID of the note currently open in the editor.
		 *
		 * Access the value of this facet using
		 * ```ts
		 * const noteIdFacet = editorControl.joplinExtensions.noteIdFacet;
		 * const editorState = editorControl.editor.state;
		 * const noteId = editorState.facet(noteIdFacet);
		 * ```
		 */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- No better type available
		noteIdFacet: any;
		/**
		 * A CodeMirror [StateEffect](https://codemirror.net/docs/ref/#state.StateEffect) that is
		 * included in a [Transaction](https://codemirror.net/docs/ref/#state.Transaction) when the
		 * note ID changes.
		 */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- No better type available
		setNoteIdEffect: any;
	};
}

export interface MarkdownEditorContentScriptModule extends Omit<ContentScriptModule, 'plugin'> {
	plugin: (editorControl: CodeMirrorControl)=> void;
}

export enum ContentScriptType {
	/**
	 * Registers a new Markdown-It plugin, which should follow the template
	 * below.
	 *
	 * ```javascript
	 * module.exports = {
	 *     default: function(context) {
	 *         return {
	 *             plugin: function(markdownIt, pluginOptions) {
	 *                 // ...
	 *             },
	 *             assets: {
	 *                 // ...
	 *             },
	 *         }
	 *     }
	 * }
	 * ```
	 *
	 * See [the
	 * demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/content_script)
	 * for a simple Markdown-it plugin example.
	 *
	 * ## Exported members
	 *
	 * - The `context` argument is currently unused but could be used later on
	 *   to provide access to your own plugin so that the content script and
	 *   plugin can communicate.
	 *
	 * - The **required** `plugin` key is the actual Markdown-It plugin - check
	 *   the [official doc](https://github.com/markdown-it/markdown-it) for more
	 *   information.
	 *
	 * - Using the **optional** `assets` key you may specify assets such as JS
	 *   or CSS that should be loaded in the rendered HTML document. Check for
	 *   example the Joplin [Mermaid
	 *   plugin](https://github.com/laurent22/joplin/blob/dev/packages/renderer/MdToHtml/rules/mermaid.ts)
	 *   to see how the data should be structured.
	 *
	 * ## Supporting the Rich Text Editor
	 *
	 * Joplin's Rich Text Editor works with rendered HTML, which is converted back
	 * to markdown when saving. To prevent the original markdown for your plugin from
	 * being lost, Joplin needs additional metadata.
	 *
	 * To provide this,
	 * 1. Wrap the HTML generated by your plugin in an element with class `joplin-editable`.
	 *    For example,
	 *    ```html
	 *    <div class="joplin-editable">
	 *        ...your html...
	 *    </div>
	 *    ```
	 * 2. Add a child with class `joplin-source` that contains the original markdown that
	 *    was rendered by your plugin. Include `data-joplin-source-open`, `data-joplin-source-close`,
	 *    and `data-joplin-language` attributes.
	 *    For example, if your plugin rendered the following code block,
	 *    ````
	 *    ```foo
	 *    ... original source here ...
	 *    ```
	 *    ````
	 *    then it should render to
	 *    ```html
	 *    <div class="joplin-editable">
	 *        <pre
	 *            class="joplin-source"
	 *            data-joplin-language="foo"
	 *            data-joplin-source-open="```foo&NewLine;"
	 *            data-joplin-source-close="```"
	 *        > ... original source here ... </pre>
	 *        ... rendered HTML here ...
	 *    </div>
	 *    ```
	 *
	 * See [the demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/content_script)
	 * for a complete example.
	 *
	 * ## Getting the settings from the renderer
	 *
	 * You can access your plugin settings from the renderer by calling
	 * `pluginOptions.settingValue("your-setting-key')`.
	 *
	 * ## Posting messages from the content script to your plugin
	 *
	 * The application provides the following function to allow executing
	 * commands from the rendered HTML code:
	 *
	 * ```javascript
	 * const response = await webviewApi.postMessage(contentScriptId, message);
	 * ```
	 *
	 * - `contentScriptId` is the ID you've defined when you registered the
	 *   content script. You can retrieve it from the
	 *   {@link ContentScriptContext | context}.
	 * - `message` can be any basic JavaScript type (number, string, plain
	 *   object), but it cannot be a function or class instance.
	 *
	 * When you post a message, the plugin can send back a `response` thus
	 * allowing two-way communication:
	 *
	 * ```javascript
	 * await joplin.contentScripts.onMessage(contentScriptId, (message) => {
	 *     // Process message
	 *     return response; // Can be any object, string or number
	 * });
	 * ```
	 *
	 * See {@link JoplinContentScripts.onMessage} for more details, as well as
	 * the [postMessage
	 * demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/post_messages).
	 *
	 * ## Registering an existing Markdown-it plugin
	 *
	 * To include a regular Markdown-It plugin, that doesn't make use of any
	 * Joplin-specific features, you would simply create a file such as this:
	 *
	 * ```javascript
	 * module.exports = {
	 *     default: function(context) {
	 *         return {
	 *             plugin: require('markdown-it-toc-done-right');
	 *         }
	 *     }
	 * }
	 * ```
	 */
	MarkdownItPlugin = 'markdownItPlugin',

	/**
	 * Registers a new CodeMirror plugin, which should follow the template
	 * below.
	 *
	 * ```javascript
	 * module.exports = {
	 *     default: function(context) {
	 *         return {
	 *             plugin: function(CodeMirror) {
	 *                 // ...
	 *             },
	 *             codeMirrorResources: [],
	 *             codeMirrorOptions: {
	 *                                  // ...
	 *                       },
	 *             assets: {
	 *                 // ...
	 *             },
	 *         }
	 *     }
	 * }
	 * ```
	 *
	 * - The `context` argument allows communicating with other parts of
	 *   your plugin (see below).
	 *
	 * - The `plugin` key is your CodeMirror plugin. This is where you can
	 *   register new commands with CodeMirror or interact with the CodeMirror
	 *   instance as needed.
	 *
	 * - **CodeMirror 5 only**: The `codeMirrorResources` key is an array of CodeMirror resources that
	 *   will be loaded and attached to the CodeMirror module. These are made up
	 *   of addons, keymaps, and modes. For example, for a plugin that want's to
	 *   enable clojure highlighting in code blocks. `codeMirrorResources` would
	 *   be set to `['mode/clojure/clojure']`.
	 *   This field is ignored on mobile and when the desktop beta editor is enabled.
	 *
	 * - **CodeMirror 5 only**: The `codeMirrorOptions` key contains all the
	 *   [CodeMirror](https://codemirror.net/doc/manual.html#config) options
	 *   that will be set or changed by this plugin. New options can alse be
	 *   declared via
	 *   [`CodeMirror.defineOption`](https://codemirror.net/doc/manual.html#defineOption),
	 *   and then have their value set here. For example, a plugin that enables
	 *   line numbers would set `codeMirrorOptions` to `{'lineNumbers': true}`.
	 *
	 * - Using the **optional** `assets` key you may specify **only** CSS assets
	 *   that should be loaded in the rendered HTML document. Check for example
	 *   the Joplin [Mermaid
	 *   plugin](https://github.com/laurent22/joplin/blob/dev/packages/renderer/MdToHtml/rules/mermaid.ts)
	 *   to see how the data should be structured.
	 *
	 * One of the `plugin`, `codeMirrorResources`, or `codeMirrorOptions` keys
	 * must be provided for the plugin to be valid. Having multiple or all
	 * provided is also okay.
	 *
	 * See also:
	 * - The [demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/codemirror_content_script)
	 *   for an example of all these keys being used in one plugin.
	 * - See [the editor plugin tutorial](https://joplinapp.org/help/api/tutorials/cm6_plugin)
	 *   for how to develop a plugin for the mobile editor and the desktop beta markdown editor.
	 *
	 * ## Posting messages from the content script to your plugin
	 *
	 * In order to post messages to the plugin, you can use the postMessage
	 * function passed to the {@link ContentScriptContext | context}.
	 *
	 * ```javascript
	 * const response = await context.postMessage('messageFromCodeMirrorContentScript');
	 * ```
	 *
	 * When you post a message, the plugin can send back a `response` thus
	 * allowing two-way communication:
	 *
	 * ```javascript
	 * await joplin.contentScripts.onMessage(contentScriptId, (message) => {
	 *     // Process message
	 *     return response; // Can be any object, string or number
	 * });
	 * ```
	 *
	 * See {@link JoplinContentScripts.onMessage} for more details, as well as
	 * the [postMessage
	 * demo](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/post_messages).
	 *
	 */
	CodeMirrorPlugin = 'codeMirrorPlugin',
}
