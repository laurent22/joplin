import InteropService from 'lib/services/interop/InteropService';
import { Module, ModuleType } from 'lib/services/interop/types';
import { ExportModule, ImportModule } from './types';

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
