import { ModelType } from '../../BaseModel';
import { FileApi, MultiPutItem } from '../../file-api';
import JoplinError from '../../JoplinError';
import Logger from '../../Logger';
import BaseItem from '../../models/BaseItem';
import { BaseItemEntity } from '../database/types';

const logger = Logger.create('ItemUploader');

export type ApiCallFunction = (fnName: string, ...args: any[])=> Promise<any>;

interface BatchItem extends MultiPutItem {
	localItemUpdatedTime: number;
}

export default class ItemUploader {

	private api_: FileApi;
	private apiCall_: ApiCallFunction;
	private preUploadedItems_: Record<string, any> = {};
	private preUploadedItemUpdatedTimes_: Record<string, number> = {};
	private maxBatchSize_ = 1 * 1024 * 1024; // 1MB;

	public constructor(api: FileApi, apiCall: ApiCallFunction) {
		this.api_ = api;
		this.apiCall_ = apiCall;
	}

	public get maxBatchSize() {
		return this.maxBatchSize_;
	}

	public set maxBatchSize(v: number) {
		this.maxBatchSize_ = v;
	}

	public async serializeAndUploadItem(ItemClass: any, path: string, local: BaseItemEntity) {
		const preUploadItem = this.preUploadedItems_[path];
		if (preUploadItem) {
			if (this.preUploadedItemUpdatedTimes_[path] !== local.updated_time) {
				// Normally this should be rare as it can only happen if the
				// item has been changed between the moment it was pre-uploaded
				// and the moment where it's being processed by the
				// synchronizer. It could happen for example for a note being
				// edited just at the same time. In that case, we proceed with
				// the regular upload.
				logger.warn(`Pre-uploaded item updated_time has changed. It is going to be re-uploaded again: ${path} (From ${this.preUploadedItemUpdatedTimes_[path]} to ${local.updated_time})`);
			} else {
				const error = preUploadItem.error;
				if (error) throw new JoplinError(error.message ? error.message : 'Unknown pre-upload error', error.code);
				return;
			}
		}
		const content = await ItemClass.serializeForSync(local);
		await this.apiCall_('put', path, content);
	}

	public async preUploadItems(items: BaseItemEntity[]) {
		if (!this.api_.supportsMultiPut) return;

		const itemsToUpload: BatchItem[] = [];

		for (const local of items) {
			// For resources, additional logic is necessary - in particular the blob
			// should be uploaded before the metadata, so we can't batch process.
			if (local.type_ === ModelType.Resource) continue;

			const ItemClass = BaseItem.itemClass(local);
			itemsToUpload.push({
				name: BaseItem.systemPath(local),
				body: await ItemClass.serializeForSync(local),
				localItemUpdatedTime: local.updated_time,
			});
		}

		let batchSize = 0;
		let currentBatch: BatchItem[] = [];

		const uploadBatch = async (batch: BatchItem[]) => {
			for (const batchItem of batch) {
				this.preUploadedItemUpdatedTimes_[batchItem.name] = batchItem.localItemUpdatedTime;
			}

			const response = await this.apiCall_('multiPut', batch);
			this.preUploadedItems_ = {
				...this.preUploadedItems_,
				...response.items,
			};
		};

		while (itemsToUpload.length) {
			const itemToUpload = itemsToUpload.pop();
			const itemSize = itemToUpload.name.length + itemToUpload.body.length;

			// Although it should be rare, if the item itself is above the
			// batch max size, we skip it. In that case it will be uploaded the
			// regular way when the synchronizer calls `serializeAndUploadItem()`
			if (itemSize > this.maxBatchSize) continue;

			if (batchSize + itemSize > this.maxBatchSize) {
				await uploadBatch(currentBatch);
				batchSize = itemSize;
				currentBatch = [itemToUpload];
			} else {
				batchSize += itemSize;
				currentBatch.push(itemToUpload);
			}
		}

		if (currentBatch.length) await uploadBatch(currentBatch);
	}

}
