import InteropService_Importer_Base from './InteropService_Importer_Base';
import { CustomImportContext, ImportExportResult } from './types';

export default class InteropService_Importer_Custom extends InteropService_Importer_Base {

	private handler_:any = null;

	constructor(handler:any) {
		super();
		this.handler_ = handler;
	}

	async exec(result:ImportExportResult) {
		if (this.handler_.exec) {
			const context:CustomImportContext = {
				sourcePath: this.sourcePath_,
				options: this.options_,
				warnings: result.warnings,
			};
			return this.handler_.exec(context);
		}

		return result;
	}
}
