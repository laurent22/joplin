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
	execute(...args: any[]): Promise<any | void>;

	/**
	 * Defines whether the command should be enabled or disabled, which in turns affects
	 * the enabled state of any associated button or menu item.
	 *
	 * The condition should be expressed as a "when-clause" (as in Visual Studio Code). It's a simple boolean expression that evaluates to
	 * `true` or `false`. It supports the following operators:
	 *
	 * Operator | Symbol | Example
	 * -- | -- | --
	 * Equality | == | "editorType == markdown"
	 * Inequality | != | "currentScreen != config"
	 * Or | \|\| | "noteIsTodo \|\| noteTodoCompleted"
	 * And | && | "oneNoteSelected && !inConflictFolder"
	 *
	 * Currently the supported context variables aren't documented, but you can [find the list here](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/lib/services/commands/stateToWhenClauseContext.ts).
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
	onProcessItem(context: ExportContext, itemType: number, item: any): Promise<void>;

	/**
	 * Called when a resource file needs to be exported.
	 */
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
	 * You can attach your own custom data using this propery - it will then be passed to each event handler, allowing you to keep state from one event to the next.
	 */
	userData?: any;
}

export interface ImportContext {
	sourcePath: string;
	options: any;
	warnings: string[];
}

// =================================================================
// Misc types
// =================================================================

export interface Script {
	onStart?(event: any): Promise<void>;
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
	NoteListContextMenu = 'noteListContextMenu',
	EditorContextMenu = 'editorContextMenu',
}

export interface MenuItem {
	/**
	 * Command that should be associated with the menu item. All menu item should
	 * have a command associated with them unless they are a sub-menu.
	 */
	commandName?: string;

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
	value?: any;
}

export interface DialogResult {
	id: ButtonId;
	formData?: any;
}

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

// Redefine a simplified interface to mask internal details
// and to remove function calls as they would have to be async.
export interface SettingItem {
	value: any;
	type: SettingItemType;
	public: boolean;
	label: string;

	description?: string;
	isEnum?: boolean;
	section?: string;
	options?: any;
	appTypes?: string[];
	secure?: boolean;
	advanced?: boolean;
	minimum?: number;
	maximum?: number;
	step?: number;
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
 * [0]: Resource name (eg. "notes", "folders", "tags", etc.)
 * [1]: (Optional) Resource ID.
 * [2]: (Optional) Resource link.
 */
export type Path = string[];

// =================================================================
// Plugins type
// =================================================================

export enum ContentScriptType {
	/**
	 * Registers a new Markdown-It plugin, which should follow the template below.
	 *
	 * ```javascript
	 * module.exports = {
	 *     default: function(context) {
	 *         return {
	 *             plugin: function(markdownIt, options) {
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
	 * - The `context` argument is currently unused but could be used later on to provide access to your own plugin so that the content script and plugin can communicate.
	 *
	 * - The **required** `plugin` key is the actual Markdown-It plugin - check the [official doc](https://github.com/markdown-it/markdown-it) for more information. The `options` parameter is of type [RuleOptions](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/lib/joplin-renderer/MdToHtml.ts), which contains a number of options, mostly useful for Joplin's internal code.
	 *
	 * - Using the **optional** `assets` key you may specify assets such as JS or CSS that should be loaded in the rendered HTML document. Check for example the Joplin [Mermaid plugin](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/lib/joplin-renderer/MdToHtml/rules/mermaid.ts) to see how the data should be structured.
	 *
	 * To include a regular Markdown-It plugin, that doesn't make use of any Joplin-specific features, you would simply create a file such as this:
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
	 * Registers a new CodeMirror plugin, which should follow the template below.
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
	 *									// ...
	 *						 },
	 *             assets: {
	 *                 // ...
	 *             },
	 *         }
	 *     }
	 * }
	 * ```
	 *
	 * - The `context` argument is currently unused but could be used later on to provide access to your own plugin so that the content script and plugin can communicate.
	 *
	 * - The `plugin` key is your CodeMirror plugin. This is where you can register new commands with CodeMirror or interact with the CodeMirror instance as needed.
	 *
	 * - The `codeMirrorResources` key is an array of CodeMirror resources that will be loaded and attached to the CodeMirror module. These are made up of addons, keymaps, and modes. For example, for a plugin that want's to enable clojure highlighting in code blocks. `codeMirrorResources` would be set to `['mode/clojure/clojure']`.
	 *
	 * - The `codeMirrorOptions` key contains all the [CodeMirror](https://codemirror.net/doc/manual.html#config) options that will be set or changed by this plugin. New options can alse be declared via [`CodeMirror.defineOption`](https://codemirror.net/doc/manual.html#defineOption), and then have their value set here. For example, a plugin that enables line numbers would set `codeMirrorOptions` to `{'lineNumbers': true}`.
	 *
	 * - Using the **optional** `assets` key you may specify **only** CSS assets that should be loaded in the rendered HTML document. Check for example the Joplin [Mermaid plugin](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/lib/joplin-renderer/MdToHtml/rules/mermaid.ts) to see how the data should be structured.
	 *
	 * One of the `plugin`, `codeMirrorResources`, or `codeMirrorOptions` keys must be provided for the plugin to be valid. Having multiple or all provided is also okay.
	 *
	 * See the [demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/codemirror_content_script) for an example of all these keys being used in one plugin.
	 */
	CodeMirrorPlugin = 'codeMirrorPlugin',
}
