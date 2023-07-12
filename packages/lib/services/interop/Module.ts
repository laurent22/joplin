import { _ } from "../../locale";
import InteropService_Exporter_Base from "./InteropService_Exporter_Base";
import InteropService_Importer_Base from "./InteropService_Importer_Base";
import { FileSystemItem, ImportModuleOutputFormat, ModuleType } from "./types";

// Metadata shared between importers and exporters.
interface BaseMetadata {
	format: string;
	fileExtensions: string[];
	description: string;
	isDefault: boolean;

	// Only applies to single file exporters or importers
	// It tells whether the format can package multiple notes into one file.
	// For example JEX or ENEX can, but HTML cannot.
	// Default: true.
	isNoteArchive: boolean;
}

const defaultBaseMetadata = {
	format: '',
	fileExtensions: [] as string[],
	description: '',
	isNoteArchive: true,
	isDefault: false,
};

interface ImportMetadata extends BaseMetadata {
	type: ModuleType.Importer;

	sources: FileSystemItem[];
	importerClass: string;
	outputFormat: ImportModuleOutputFormat;
}

interface ExportMetadata extends BaseMetadata {
	type: ModuleType.Exporter;

	target: FileSystemItem;
}

// Either ImportMetadata or ExportMetadata
type ImportExportMetadata<Type extends ModuleType>
		= Type extends ModuleType.Importer ? ImportMetadata : ExportMetadata;

type ImporterOrExporter<Type extends ModuleType>
		= Type extends ModuleType.Importer ? InteropService_Importer_Base : InteropService_Exporter_Base;

type FactoryFunction<Type extends ModuleType> = ()=>ImporterOrExporter<Type>;

class ImporterExporterModule<Type extends ModuleType> {
	private constructor(
		public readonly type: Type,
		public readonly metadata: ImportExportMetadata<Type>,
		private readonly factory: FactoryFunction<Type>
	) { }

	public isImporter(): this is ImporterExporterModule<ModuleType.Importer> {
		return this.metadata.type === ModuleType.Importer;
	}

	public supportsFileExtension(extension: string) {
		return this.metadata.fileExtensions.includes(extension);
	}

	public fullLabel(source: FileSystemItem = null) {
		const format = this.metadata.format.split('_')[0];
		const label = [`${format.toUpperCase()} - ${this.metadata.description}`];
		if (this.metadata.type === ModuleType.Importer) {
			if (this.metadata.sources.length > 1) {
				label.push(`(${source === 'file' ? _('File') : _('Directory')})`);
			}
		}
		return label.join(' ');
	}

	public createInstance(options?: any): ImporterOrExporter<Type> {
		const result = this.factory();
		result.setMetadata({ ...this.metadata, ...(options ?? {}) });
		return result;
	}

	public static fromImporter(
		metadata: Partial<ImportMetadata>, factory: FactoryFunction<ModuleType.Importer>
	) {
		const importerDefaults: ImportMetadata = {
			...defaultBaseMetadata,
			type: ModuleType.Importer,
			sources: [],
			importerClass: '',
			outputFormat: ImportModuleOutputFormat.Markdown,
		};

		return new ImporterExporterModule<ModuleType.Importer>(ModuleType.Importer, {
			...importerDefaults,
			...metadata
		}, factory);
	}

	public static fromExporter(
		metadata: Partial<ExportMetadata>, factory: FactoryFunction<ModuleType.Exporter>
	) {
		const exporterDefaults: ExportMetadata = {
			...defaultBaseMetadata,
			type: ModuleType.Exporter,
			target: FileSystemItem.File,
		};
		
		return new ImporterExporterModule<ModuleType.Exporter>(ModuleType.Exporter, {
			...exporterDefaults,
			...metadata
		}, factory);
	}
}

export type ImportModule = ImporterExporterModule<ModuleType.Importer>;
export type ExportModule = ImporterExporterModule<ModuleType.Exporter>;

export default ImporterExporterModule<ModuleType>;

