/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: 0 */

import { ImportExportResult } from './types';

import Setting from '../../models/Setting';

export default class InteropService_Importer_Base {

	private metadata_: any = null;
	protected sourcePath_ = '';
	protected options_: any = {};

	public setMetadata(md: any) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	public async init(sourcePath: string, options: any) {
		this.sourcePath_ = sourcePath;
		this.options_ = options;
	}

	public async exec(_result: ImportExportResult): Promise<ImportExportResult> { return null; }

	protected async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}
}
