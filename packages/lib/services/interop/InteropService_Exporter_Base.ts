/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

import Setting from '../../models/Setting';
import shim from '../../shim';
import { type ExportMetadata } from './Module';
import { ExportOptions } from './types';

export default class InteropService_Exporter_Base {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private context_: any = {};
	private metadata_: ExportMetadata = null;

	public async init(_destDir: string, _options: ExportOptions = {}) {}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async prepareForProcessingItemType(_itemType: number, _itemsToExport: any[]) {}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async processItem(_itemType: number, _item: any) {}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async processResource(_resource: any, _filePath: string) {}
	public async close() {}

	public setMetadata(md: ExportMetadata) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public updateContext(context: any) {
		this.context_ = { ...this.context_, ...context };
	}

	public context() {
		return this.context_;
	}

	protected async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await shim.fsDriver().mkdir(tempDir);
		return tempDir;
	}
}
