/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

import Setting from '../../models/Setting';

export default class InteropService_Exporter_Base {
	private context_: any = {};
	private metadata_: any = {};

	// @ts-ignore
	public async init(destDir: string, options: any = {}) {}
	// @ts-ignore
	public async prepareForProcessingItemType(itemType: number, itemsToExport: any[]) {}
	// @ts-ignore
	public async processItem(itemType: number, item: any) {}
	// @ts-ignore
	public async processResource(resource: any, filePath: string) {}
	public async close() {}

	public setMetadata(md: any) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	public updateContext(context: any) {
		this.context_ = Object.assign({}, this.context_, context);
	}

	public context() {
		return this.context_;
	}

	protected async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}
}
