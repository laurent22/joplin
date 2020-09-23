const { _ } = require('lib/locale');

export interface CustomImportContext {
	sourcePath: string,
	options: ImportOptions,
	warnings: string[],
}

export interface CustomExportContext {
	destPath: string,
	options: ExportOptions,
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

// For historical reasons the import and export modules share the same
// interface, except that some properties are used only for import
// and others only for export.
export interface Module {
	// ---------------------------------------
	// Shared properties
	// ---------------------------------------

	type: ModuleType,
	format: string,
	fileExtensions: string[],
	description: string,
	instanceFactory?: Function,
	path?: string,

	// ---------------------------------------
	// Import-only properties
	// ---------------------------------------

	sources?: FileSystemItem[],
	isNoteArchive?: boolean,
	importerClass?: string,
	outputFormat?: ImportModuleOutputFormat,
	isDefault?: boolean,
	fullLabel?: Function,

	// ---------------------------------------
	// Export-only properties
	// ---------------------------------------

	target?: FileSystemItem,
	// Tells whether the format can package multiple notes into one file. Default: true.
	canDoMultiExport?: boolean,
}

export interface ImportOptions {
	path?: string,
	format?: string
	modulePath?: string,
	destinationFolderId?: string,
	destinationFolder?: any,
	outputFormat?: ImportModuleOutputFormat,
}

export interface ExportOptions {
	format?: string,
	path?:string,
	sourceFolderIds?: string[],
	sourceNoteIds?: string[],
}

export interface ImportExportResult {
	warnings: string[],
}

function moduleFullLabel(moduleSource:FileSystemItem = null):string {
	const label = [`${this.format.toUpperCase()} - ${this.description}`];
	if (moduleSource && this.sources.length > 1) {
		label.push(`(${moduleSource === 'file' ? _('File') : _('Directory')})`);
	}
	return label.join(' ');
}

export function defaultImportExportModule(type:ModuleType):Module {
	return {
		type: type,
		format: '',
		fileExtensions: [],
		sources: [],
		description: '',
		isNoteArchive: true,
		importerClass: '',
		outputFormat: ImportModuleOutputFormat.Markdown,
		isDefault: false,
		fullLabel: moduleFullLabel,

		target: FileSystemItem.File,
		canDoMultiExport: true,
	};
}
