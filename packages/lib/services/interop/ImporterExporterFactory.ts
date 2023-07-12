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

export default class ImporterExporterFactory<Type extends ModuleType> {
	public constructor(
		private readonly metadata: ImportExportMetadata<Type>,
		private readonly factory: FactoryFunction<Type>
	) {
	}

	public createInstance(): ImporterOrExporter<Type> {
		const result = this.factory();
		result.setMetadata(this.metadata);
		return result;
	}

	public static from<Type extends ModuleType>(
		type: Type, metadata: Partial<ImportExportMetadata<Type>>, factory: FactoryFunction<Type>
	) {
		const defaults = {
			format: '',
			fileExtensions: [] as string[],
			description: '',
			isNoteArchive: true,
			isDefault: false,
		};

		if (type === ModuleType.Exporter) {
			const exporterDefaults: ExportMetadata = {
				...defaults,
				type: ModuleType.Exporter,
				target: FileSystemItem.File,
			};
			
			return new ImporterExporterFactory<ModuleType.Exporter>({
				...exporterDefaults,
				...metadata
			}, factory as FactoryFunction<ModuleType.Exporter>);
		} else {
			const importerDefaults: ImportMetadata = {
				...defaults,
				type: ModuleType.Importer,
				sources: [],
				importerClass: '',
				outputFormat: ImportModuleOutputFormat.Markdown,
			};

			return new ImporterExporterFactory<ModuleType.Importer>({
				...importerDefaults,
				...metadata
			}, factory as FactoryFunction<ModuleType.Importer>);
		}
	}
}

export type ImporterFactory = ImporterExporterFactory<ModuleType.Importer>;
export type ExporterFactory = ImporterExporterFactory<ModuleType.Exporter>;

