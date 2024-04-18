import { ImportExportResult } from './types';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import { enexImporterExec } from './InteropService_Importer_EnexToMd';

export default class InteropService_Importer_EnexToHtml extends InteropService_Importer_Base {
	public async exec(result: ImportExportResult): Promise<ImportExportResult> {
		return enexImporterExec(
			result,
			this.options_.destinationFolder,
			this.sourcePath_,
			this.metadata().fileExtensions,
			{ ...this.options_, outputFormat: 'html' },
		);
	}
}
