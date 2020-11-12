import InteropService_Importer_Base from './InteropService_Importer_Base';
import { ImportExportResult, Module } from './types';

export default class InteropService_Importer_Custom extends InteropService_Importer_Base {

	private module_: Module = null;

	constructor(handler: Module) {
		super();
		this.module_ = handler;
	}

	async exec(result: ImportExportResult) {
		return this.module_.onExec({
			sourcePath: this.sourcePath_,
			options: this.options_,
			warnings: result.warnings,
		});
	}
}
