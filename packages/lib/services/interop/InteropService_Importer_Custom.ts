import InteropService_Importer_Base from './InteropService_Importer_Base';
import { ImportExportResult, Module } from './types';

export default class InteropService_Importer_Custom extends InteropService_Importer_Base {

	private module_: Module = null;

	public constructor(handler: Module) {
		super();
		this.module_ = handler;
	}

	public async exec(result: ImportExportResult): Promise<ImportExportResult> {
		// When passing the options to the plugin, we strip off any function
		// because they won't serialized over ipc.

		const processedOptions: any = {};

		if (this.options_) {
			for (const [k, v] of Object.entries(this.options_)) {
				if (typeof v === 'function') continue;
				processedOptions[k] = v;
			}
		}

		return this.module_.onExec({
			sourcePath: this.sourcePath_,
			options: processedOptions,
			warnings: result.warnings,
		});
	}
}
