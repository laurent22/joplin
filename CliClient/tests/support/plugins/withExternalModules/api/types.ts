export interface Command {
	name: string
	label: string
	iconName?: string,
	execute(props:any):Promise<any>
	isEnabled?(props:any):boolean
	mapStateToProps?(state:any):any
}

export enum FileSystemItem {
	File = 'file',
	Directory = 'directory',
}

export enum ImportModuleOutputFormat {
	Markdown = 'md',
	Html = 'html',
}

export interface ExportModule {
	format: string,
	description: string,
	target: FileSystemItem,
	isNoteArchive: boolean,
	fileExtensions?: string[],

	onInit(context:any): Promise<void>;
	onProcessItem(context:any, itemType:number, item:any):Promise<void>;
	onProcessResource(context:any, resource:any, filePath:string):Promise<void>;
	onClose(context:any):Promise<void>;
}

export interface ImportModule {
	format: string,
	description: string,
	isNoteArchive: boolean,
	sources: FileSystemItem[],
	fileExtensions?: string[],
	outputFormat?: ImportModuleOutputFormat,

	onExec(context:any): Promise<void>;
}

export interface Script {
	onStart?(event:any):Promise<void>,
}

export interface ButtonSpec {
	id: string,
	title?: string,
	onClick?():void,
}

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

export enum ToolbarButtonLocation {
	NoteToolbar = 'noteToolbar',
	EditorToolbar = 'editorToolbar',
}
export interface EditorCommand {
	name: string;
	value?: any;
}

export type ViewHandle = string;
