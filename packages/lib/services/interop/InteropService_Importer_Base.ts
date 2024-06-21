/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: 0 */

import { ImportExportResult, ImportOptions } from './types';

import Setting from '../../models/Setting';
import shim from '../../shim';
import { type ImportMetadata } from './Module';

export default class InteropService_Importer_Base {

	private metadata_: ImportMetadata = null;
	protected sourcePath_ = '';
	protected options_: ImportOptions = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public setMetadata(md: any) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async init(sourcePath: string, options: any) {
		this.sourcePath_ = sourcePath;
		this.options_ = options;
	}

	public async exec(_result: ImportExportResult): Promise<ImportExportResult> { return null; }

	protected async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await shim.fsDriver().mkdir(tempDir);
		return tempDir;
	}
}
