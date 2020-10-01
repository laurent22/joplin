import InteropService from 'lib/services/interop/InteropService';
import { FileSystemItem, ImportModuleOutputFormat, Module, ModuleType } from 'lib/services/interop/types';

interface ExportModule {
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

interface ImportModule {
	format: string,
	description: string,
	isNoteArchive: boolean,
	sources: FileSystemItem[],
	fileExtensions?: string[],
	outputFormat?: ImportModuleOutputFormat,

	onExec(context:any): Promise<void>;
}

export default class JoplinInterop {

	async registerExportModule(module:ExportModule) {
		const internalModule:Module = {
			...module,
			type: ModuleType.Exporter,
			isCustom: true,
			fileExtensions: module.fileExtensions ? module.fileExtensions : [],
		};

		return InteropService.instance().registerModule(internalModule);
	}

	async registerImportModule(module:ImportModule) {
		const internalModule:Module = {
			...module,
			type: ModuleType.Importer,
			isCustom: true,
			fileExtensions: module.fileExtensions ? module.fileExtensions : [],
		};

		return InteropService.instance().registerModule(internalModule);
	}

}
