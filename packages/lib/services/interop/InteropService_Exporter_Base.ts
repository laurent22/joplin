/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

import Setting from '../../models/Setting';

export default class InteropService_Exporter_Base {
	private context_: any = {};
	private metadata_: any = {};

	// @ts-ignore
	async init(destDir: string, options: any = {}) {}
	// @ts-ignore
	async prepareForProcessingItemType(itemType: number, itemsToExport: any[]) {}
	// @ts-ignore
	async processItem(itemType: number, item: any) {}
	// @ts-ignore
	async processResource(resource: any, filePath: string) {}
	async close() {}

	setMetadata(md: any) {
		this.metadata_ = md;
	}

	metadata() {
		return this.metadata_;
	}

	updateContext(context: any) {
		this.context_ = Object.assign({}, this.context_, context);
	}

	context() {
		return this.context_;
	}

	async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}
}
