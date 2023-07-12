/* eslint-disable multiline-comment-style */

import InteropService from '../../interop/InteropService';
import InteropService_Exporter_Custom from '../../interop/InteropService_Exporter_Custom';
import InteropService_Importer_Custom from '../../interop/InteropService_Importer_Custom';
import { Module, ModuleType } from '../../interop/types';
import { ExportModule, ImportModule } from './types';

/**
 * Provides a way to create modules to import external data into Joplin or to export notes into any arbitrary format.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/json_export)
 *
 * To implement an import or export module, you would simply define an object with various event handlers that are called
 * by the application during the import/export process.
 *
 * See the documentation of the [[ExportModule]] and [[ImportModule]] for more information.
 *
 * You may also want to refer to the Joplin API documentation to see the list of properties for each item (note, notebook, etc.) - https://joplinapp.org/api/references/rest_api/
 */
export default class JoplinInterop {

	public async registerExportModule(module: ExportModule) {
		const internalModule: Module = {
			...module,
			type: ModuleType.Exporter,
			isCustom: true,
			fullLabel: () => module.description,
			fileExtensions: module.fileExtensions ? module.fileExtensions : [],

			factory: () => {
				return new InteropService_Exporter_Custom(module);
			},
		};

		return InteropService.instance().registerModule(internalModule);
	}

	public async registerImportModule(module: ImportModule) {
		const internalModule: Module = {
			...module,
			type: ModuleType.Importer,
			isCustom: true,
			fullLabel: () => module.description,
			fileExtensions: module.fileExtensions ? module.fileExtensions : [],

			factory: () => {
				return new InteropService_Importer_Custom(module);
			},
		};

		return InteropService.instance().registerModule(internalModule);
	}

}
