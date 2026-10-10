/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

import Setting from '../../models/Setting';
import shim from '../../shim';
import { type ExportMetadata } from './Module';
import { BaseItemEntity, ResourceEntity } from '../database/types';
import { ExportOptions } from './types';
import { friendlySafeFilename } from '../../path-utils';
import { _ } from '../../locale';
import BaseModel from '../../BaseModel';

interface ItemWithTitle {
	encryption_applied?: number;
	id?: string;
	title?: string;
	type_?: number;
}

export default class InteropService_Exporter_Base {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Context shape is exporter-specific (Html exporter has cssStrings/customAssets, Md exporter has noteTags/tagTitles, etc.) and used heterogeneously across subclasses
	private context_: any = {};
	private metadata_: ExportMetadata = null;
	private truncatedItemWarnings_: Set<string> = new Set();

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

	protected itemTitleToFilename_(item: ItemWithTitle) {
		const title = item.title || '';
		const filename = friendlySafeFilename(title);
		if (item.encryption_applied) return filename;

		const untruncatedFilename = friendlySafeFilename(title, title.length);
		const warningKey = `${item.type_}:${item.id || title}`;

		if (filename !== untruncatedFilename && !this.truncatedItemWarnings_.has(warningKey)) {
			this.truncatedItemWarnings_.add(warningKey);
			const warning = item.type_ === BaseModel.TYPE_FOLDER
				? _('The notebook title "%s" was truncated to "%s" in the exported folder name.', title, filename)
				: _('The note title "%s" was truncated to "%s" in the exported file name.', title, filename);
			this.context_.warnings?.push(warning);
		}

		return filename;
	}

	protected async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await shim.fsDriver().mkdir(tempDir);
		return tempDir;
	}
}
