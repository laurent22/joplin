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

export enum ExportModuleOutputFormat {
	Enex = 'enex',
	Html = 'html',
	Jex = 'jex',
	Markdown = 'md',
	MarkdownFrontMatter = 'md_frontmatter',
	Memory = 'memory',
	Pdf = 'pdf',
	Raw = 'raw',
}

export interface ImportOptions {
	path?: string;
	format?: string;
	// modulePath?: string;
	destinationFolderId?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	destinationFolder?: any;
	outputFormat?: ImportModuleOutputFormat;

	// Only supported by some importers.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onProgress?: (progressState: any, progress?: any)=> void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onError?: (error: any)=> void;
	document?: Document;
	xmlSerializer?: XMLSerializer;

	defaultFolderTitle?: string;
}

export enum ExportProgressState {
	QueuingItems,
	Exporting,
	Closing,
}

export type OnExportProgressCallback = (status: ExportProgressState, progress: number)=> void;

export interface ExportOptions {
	format?: ExportModuleOutputFormat;
	path?: string;
	sourceFolderIds?: string[];
	sourceNoteIds?: string[];
	// modulePath?: string;
	target?: FileSystemItem;
	includeConflicts?: boolean;
	plugins?: PluginStates;
	customCss?: string;
	packIntoSingleFile?: boolean;

	onProgress?: OnExportProgressCallback;
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
