import { _ } from '../../locale';
import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import { ExportOptions, FileSystemItem, ImportModuleOutputFormat, ImportOptions, ModuleType } from './types';

// Metadata shared between importers and exporters.
interface BaseMetadata {
	format: string;
	fileExtensions: string[];
	description: string;
	isDefault: boolean;

	// Returns the full label to be displayed in the UI.
	fullLabel(moduleSource?: FileSystemItem): string;

	// Only applies to single file exporters or importers
	// It tells whether the format can package multiple notes into one file.
	// For example JEX or ENEX can, but HTML cannot.
	// Default: true.
	isNoteArchive: boolean;
}

interface ImportMetadata extends BaseMetadata {
	type: ModuleType.Importer;

	sources: FileSystemItem[];
	importerClass: string;
	outputFormat: ImportModuleOutputFormat;
}

export interface ImportModule extends ImportMetadata {
	factory(options?: ImportOptions): InteropService_Importer_Base;
}

interface ExportMetadata extends BaseMetadata {
	type: ModuleType.Exporter;

	target: FileSystemItem;
}

export interface ExportModule extends ExportMetadata {
	factory(options?: ExportOptions): InteropService_Exporter_Base;
}

const defaultBaseMetadata = {
	format: '',
	fileExtensions: [] as string[],
	description: '',
	isNoteArchive: true,
	isDefault: false,
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
	metadata: Partial<ImportMetadata>, factory: ()=> InteropService_Importer_Base
): ImportModule => {
	const importerDefaults: ImportMetadata = {
		...defaultBaseMetadata,
		type: ModuleType.Importer,
		sources: [],
		importerClass: '',
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
	metadata: Partial<ExportMetadata>, factory: ()=> InteropService_Exporter_Base
): ExportModule => {
	const exporterDefaults: ExportMetadata = {
		...defaultBaseMetadata,
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
