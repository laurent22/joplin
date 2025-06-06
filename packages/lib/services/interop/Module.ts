import { _ } from '../../locale';
import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import { ExportModuleOutputFormat, ExportOptions, FileSystemItem, ImportModuleOutputFormat, ImportOptions, ModuleType } from './types';

// Metadata shared between importers and exporters.
interface BaseMetadata {
	fileExtensions: string[];
	description: string;
	isDefault: boolean;
	separatorAfter: boolean; // this isn't a property of the importer, but of how it should be displayed in the GUI

	supportsMobile: boolean;

	// Returns the full label to be displayed in the UI.
	fullLabel(moduleSource?: FileSystemItem): string;

	// Only applies to single file exporters or importers
	// It tells whether the format can package multiple notes into one file.
	// For example JEX or ENEX can, but HTML cannot.
	// Default: true.
	isNoteArchive: boolean;
}

export interface ImportMetadata extends BaseMetadata {
	type: ModuleType.Importer;
	format: string;

	sources: FileSystemItem[];
	outputFormat: ImportModuleOutputFormat;
}

export interface ImportModule extends ImportMetadata {
	factory(options?: ImportOptions): InteropService_Importer_Base;
}

export interface ExportMetadata extends BaseMetadata {
	type: ModuleType.Exporter;
	format: ExportModuleOutputFormat;

	target: FileSystemItem;
}

export interface ExportModule extends ExportMetadata {
	factory(options?: ExportOptions): InteropService_Exporter_Base;
}

const defaultBaseMetadata = {
	fileExtensions: [] as string[],
	description: '',
	isNoteArchive: true,
	supportsMobile: true,
	isDefault: false,
	separatorAfter: false,
};

const moduleFullLabel = (metadata: ImportMetadata|ExportMetadata, moduleSource: FileSystemItem = null) => {
	const format = metadata.format.split('_')[0];
	const label = [`${format.toUpperCase()} - ${metadata.description}`];
	if (moduleSource && metadata.type === ModuleType.Importer && metadata.sources.length > 1) {
		label.push(`(${moduleSource === FileSystemItem.File ? _('File') : _('Directory')})`);
	}
	return label.join(' ');
};

export const makeImportModule = (
	metadata: Partial<ImportMetadata>, factory: ()=> InteropService_Importer_Base,
): ImportModule => {
	const importerDefaults: ImportMetadata = {
		...defaultBaseMetadata,
		format: '',
		type: ModuleType.Importer,
		sources: [],
		outputFormat: ImportModuleOutputFormat.Markdown,

		fullLabel: (moduleSource?: FileSystemItem) => {
			return moduleFullLabel(fullMetadata, moduleSource);
		},
	};

	const fullMetadata = {
		...importerDefaults,
		...metadata,
	};

	return {
		...fullMetadata,
		factory: (options: ImportOptions = {}) => {
			const result = factory();
			result.setMetadata({ ...fullMetadata, ...(options ?? {}) });

			return result;
		},
	};
};

export const makeExportModule = (
	metadata: Partial<ExportMetadata>, factory: ()=> InteropService_Exporter_Base,
): ExportModule => {
	const exporterDefaults: ExportMetadata = {
		...defaultBaseMetadata,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		format: '' as any,
		type: ModuleType.Exporter,
		target: FileSystemItem.File,

		fullLabel: (moduleSource?: FileSystemItem) => {
			return moduleFullLabel(fullMetadata, moduleSource);
		},
	};

	const fullMetadata = {
		...exporterDefaults,
		...metadata,
	};

	return {
		...fullMetadata,
		factory: (options: ExportOptions = {}) => {
			const result = factory();
			result.setMetadata({ ...fullMetadata, ...(options ?? {}) });

			return result;
		},
	};
};

type Module = ImportModule|ExportModule;
export default Module;
