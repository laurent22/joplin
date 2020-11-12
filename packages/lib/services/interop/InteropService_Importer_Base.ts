/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: 0 */

import { ImportExportResult } from './types';

const Setting = require('../../models/Setting').default;

export default class InteropService_Importer_Base {
	private metadata_: any = null;
	protected sourcePath_: string = '';
	protected options_: any = {}

	setMetadata(md: any) {
		this.metadata_ = md;
	}

	metadata() {
		return this.metadata_;
	}

	async init(sourcePath: string, options: any) {
		this.sourcePath_ = sourcePath;
		this.options_ = options;
	}

	// @ts-ignore
	async exec(result: ImportExportResult) {}

	async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}
}
