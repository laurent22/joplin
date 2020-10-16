// =================================================================
// Command API types
// =================================================================

export interface Command {
	name: string
	label: string
	iconName?: string,
	execute(props:any):Promise<any>
	isEnabled?(props:any):boolean
	mapStateToProps?(state:any):any
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
 * Used to implement a module to export data from Joplin. [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/CliClient/tests/support/plugins/json_export) for an example.
 *
 * In general, all the event handlers you'll need to implement take a `context` object as a first argument. This object will contain the export or import path as well as various optional properties, such as which notes or notebooks need to be exported.
 *
 * To get a better sense of what it will contain it can be useful to print it using `console.info(context)`.
 */
export interface ExportModule {
	/**
	 * The format to be exported, eg "enex", "jex", "json", etc.
	 */
	format: string,

	/**
	 * The description that will appear in the UI, for example in the menu item.
	 */
	description: string,

	/**
	 * Whether the module will export a single file or multiple files in a directory. It affects the open dialog that will be presented to the user when using your exporter.
	 */
	target: FileSystemItem,

	/**
	 * Only applies to single file exporters or importers
	 * It tells whether the format can package multiple notes into one file.
	 * For example JEX or ENEX can, but HTML cannot.
	 */
	isNoteArchive: boolean,

	/**
	 * The extensions of the files exported by your module. For example, it is `["htm", "html"]` for the HTML module, and just `["jex"]` for the JEX module.
	 */
	fileExtensions?: string[],

	/**
	 * Called when the export process starts.
	 */
	onInit(context:ExportContext): Promise<void>;

	/**
	 * Called when an item needs to be processed. An "item" can be any Joplin object, such as a note, a folder, a notebook, etc.
	 */
	onProcessItem(context:ExportContext, itemType:number, item:any):Promise<void>;

	/**
	 * Called when a resource file needs to be exported.
	 */
	onProcessResource(context:ExportContext, resource:any, filePath:string):Promise<void>;

	/**
	 * Called when the export process is done.
	 */
	onClose(context:ExportContext):Promise<void>;
}

export interface ImportModule {
	/**
	 * The format to be exported, eg "enex", "jex", "json", etc.
	 */
	format: string,

	/**
	 * The description that will appear in the UI, for example in the menu item.
	 */
	description: string,

	/**
	 * Only applies to single file exporters or importers
	 * It tells whether the format can package multiple notes into one file.
	 * For example JEX or ENEX can, but HTML cannot.
	 */
	isNoteArchive: boolean,

	/**
	 * The type of sources that are supported by the module. Tells whether the module can import files or directories or both.
	 */
	sources: FileSystemItem[],

	/**
	 * Tells the file extensions of the exported files.
	 */
	fileExtensions?: string[],

	/**
	 * Tells the type of notes that will be generated, either HTML or Markdown (default).
	 */
	outputFormat?: ImportModuleOutputFormat,

	/**
	 * Called when the import process starts. There is only one event handler within which you should import the complete data.
	 */
	onExec(context:ImportContext): Promise<void>;
}

export interface ExportOptions {
	format?: string,
	path?:string,
	sourceFolderIds?: string[],
	sourceNoteIds?: string[],
	modulePath?:string,
	target?:FileSystemItem,
}

export interface ExportContext {
	destPath: string,
	options: ExportOptions,

	/**
	 * You can attach your own custom data using this propery - it will then be passed to each event handler, allowing you to keep state from one event to the next.
	 */
	userData?: any,
}

export interface ImportContext {
	sourcePath: string,
	options: any,
	warnings: string[],
}

// =================================================================
// Misc types
// =================================================================

export interface Script {
	onStart?(event:any):Promise<void>,
}

// =================================================================
// Menu types
// =================================================================

export interface CreateMenuItemOptions {
	accelerator: string,
}

export enum MenuItemLocation {
	File = 'file',
	Edit = 'edit',
	View = 'view',
	Note = 'note',
	Tools = 'tools',
	Help = 'help',
	Context = 'context',
}

export interface MenuItem {
	commandName?: string,
	accelerator?: string,
	submenu?: MenuItem[],
	label?: string,
}

// =================================================================
// View API types
// =================================================================

export interface ButtonSpec {
	id: ButtonId,
	title?: string,
	onClick?():void,
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
	value: any,
	type: SettingItemType,
	public: boolean,
	label:string,

	description?:string,
	isEnum?: boolean,
	section?: string,
	options?:any,
	appTypes?:string[],
	secure?: boolean,
	advanced?: boolean,
	minimum?: number,
	maximum?: number,
	step?: number,
}

export interface SettingSection {
	label: string,
	iconName?: string,
	description?: string,
	name?: string,
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
