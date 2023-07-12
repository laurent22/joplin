import InteropService_Importer_Base from './InteropService_Importer_Base';
import { ImportExportResult } from './types';

interface CustomImporter {
	onExec(
		context: { sourcePath: string, options: any, warnings: string[] }
	): Promise<void>;
}

export default class InteropService_Importer_Custom extends InteropService_Importer_Base {

	private module_: CustomImporter = null;

	public constructor(handler: CustomImporter) {
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

		this.module_.onExec({
			sourcePath: this.sourcePath_,
			options: processedOptions,
			warnings: result.warnings,
		});

		return result;
	}
}
