import { PluginStates } from '../plugins/reducer';

export interface CustomImportContext {
	sourcePath: string;
	options: ImportOptions;
	warnings: string[];
}

export interface CustomExportContext {
	destPath: string;
	options: ExportOptions;
}

export enum ModuleType {
	Importer = 'importer',
	Exporter = 'exporter',
}

export enum FileSystemItem {
	File = 'file',
	Directory = 'directory',
}

export enum ImportModuleOutputFormat {
	Markdown = 'md',
	Html = 'html',
}

export interface ImportOptions {
	path?: string;
	format?: string;
	// modulePath?: string;
	destinationFolderId?: string;
	destinationFolder?: any;
	outputFormat?: ImportModuleOutputFormat;
}

export interface ExportOptions {
	format?: string;
	path?: string;
	sourceFolderIds?: string[];
	sourceNoteIds?: string[];
	// modulePath?: string;
	target?: FileSystemItem;
	includeConflicts?: boolean;
	plugins?: PluginStates;
	customCss?: string;
	packIntoSingleFile?: boolean;
}

export interface ImportExportResult {
	warnings: string[];
}

// These are the fields that will be included in an exported Md+Front Matter note
export interface MdFrontMatterExport {
	'title'?: string;
	'source'?: string;
	'author'?: string;
	'latitude'?: number;
	'longitude'?: number;
	'altitude'?: number;
	'completed?'?: string;
	'due'?: string;
	'updated'?: string;
	'created'?: string;
	'tags'?: string[];
}
