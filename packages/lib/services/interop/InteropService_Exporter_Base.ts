/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

import Setting from '../../models/Setting';
import shim from '../../shim';
import { type ExportMetadata } from './Module';
import { BaseItemEntity, ResourceEntity } from '../database/types';
import { ExportOptions } from './types';

export default class InteropService_Exporter_Base {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Context shape is exporter-specific (Html exporter has cssStrings/customAssets, Md exporter has noteTags/tagTitles, etc.) and used heterogeneously across subclasses
	private context_: any = {};
	private metadata_: ExportMetadata = null;

	public async init(_destDir: string, _options: ExportOptions = {}) {}
	public async prepareForProcessingItemType(_itemType: number, _itemsToExport: BaseItemEntity[]) {}
	public async processItem(_itemType: number, _item: BaseItemEntity) {}
	public async processResource(_resource: ResourceEntity, _filePath: string) {}
	public async close() {}

	public setMetadata(md: ExportMetadata) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	public updateContext(context: object) {
		this.context_ = { ...(this.context_ as Record<string, unknown>), ...context };
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
