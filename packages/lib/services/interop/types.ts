import { _ } from '../../locale';
import { PluginStates } from '../plugins/reducer';
import type InteropService_Exporter_Base from './InteropService_Exporter_Base';
import type InteropService_Importer_Base from './InteropService_Importer_Base';

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

interface BaseImportExportModule {
	// ---------------------------------------
	// Shared properties
	// ---------------------------------------

	format: string;
	fileExtensions: string[];
	description: string;
	// path?: string;
	isDefault?: boolean;
	fullLabel: (moduleSource?: FileSystemItem)=>void;

	// Only applies to single file exporters or importers
	// It tells whether the format can package multiple notes into one file.
	// For example JEX or ENEX can, but HTML cannot.
	// Default: true.
	isNoteArchive?: boolean;

	// A custom module is one that was not hard-coded, that was created at runtime
	// by a plugin for example. If `isCustom` is `true` if it is expected that all
	// the event handlers below are defined (it's enforced by the plugin API).
	isCustom?: boolean;
}

export interface ImportModule extends BaseImportExportModule {
	type: ModuleType.Importer;

	sources?: FileSystemItem[];
	importerClass?: string;
	outputFormat: ImportModuleOutputFormat;

	factory: ()=>InteropService_Importer_Base;
}

export interface ExportModule extends BaseImportExportModule {
	type: ModuleType.Exporter;
	target?: FileSystemItem;

	factory: ()=>InteropService_Exporter_Base;
}

export type Module = ImportModule|ExportModule;

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


function moduleFullLabel(moduleSource: FileSystemItem = null): string {
	const format = this.format.split('_')[0];
	const label = [`${format.toUpperCase()} - ${this.description}`];
	if (moduleSource && this.sources.length > 1) {
		label.push(`(${moduleSource === 'file' ? _('File') : _('Directory')})`);
	}
	return label.join(' ');
}

export const defaultImportExportModule: BaseImportExportModule = {
	format: '',
	fileExtensions: [] as string[],
	description: '',
	isNoteArchive: true,
	isDefault: false,
	fullLabel: moduleFullLabel,
	isCustom: false,
};

export const defaultImportModule = {
	...defaultImportExportModule,
	outputFormat: ImportModuleOutputFormat.Markdown,
};

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
