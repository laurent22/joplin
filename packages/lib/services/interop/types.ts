import { _ } from '../../locale';

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

// For historical reasons the import and export modules share the same
// interface, except that some properties are used only for import
// and others only for export.
export interface Module {
	// ---------------------------------------
	// Shared properties
	// ---------------------------------------

	type: ModuleType;
	format: string;
	fileExtensions: string[];
	description: string;
	// path?: string;

	// Only applies to single file exporters or importers
	// It tells whether the format can package multiple notes into one file.
	// For example JEX or ENEX can, but HTML cannot.
	// Default: true.
	isNoteArchive?: boolean;

	// A custom module is one that was not hard-coded, that was created at runtime
	// by a plugin for example. If `isCustom` is `true` if it is expected that all
	// the event handlers below are defined (it's enforced by the plugin API).
	isCustom?: boolean;

	// ---------------------------------------
	// Import-only properties
	// ---------------------------------------

	sources?: FileSystemItem[];
	importerClass?: string;
	outputFormat?: ImportModuleOutputFormat;
	isDefault?: boolean;
	fullLabel?: Function;

	// Used only if `isCustom` is true
	onExec?(context: any): Promise<void>;

	// ---------------------------------------
	// Export-only properties
	// ---------------------------------------

	target?: FileSystemItem;

	// Used only if `isCustom` is true
	onInit?(context: any): Promise<void>;
	onProcessItem?(context: any, itemType: number, item: any): Promise<void>;
	onProcessResource?(context: any, resource: any, filePath: string): Promise<void>;
	onClose?(context: any): Promise<void>;
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
}

export interface ImportExportResult {
	warnings: string[];
}

function moduleFullLabel(moduleSource: FileSystemItem = null): string {
	const label = [`${this.format.toUpperCase()} - ${this.description}`];
	if (moduleSource && this.sources.length > 1) {
		label.push(`(${moduleSource === 'file' ? _('File') : _('Directory')})`);
	}
	return label.join(' ');
}

export function defaultImportExportModule(type: ModuleType): Module {
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
		isCustom: false,
		target: FileSystemItem.File,
	};
}
