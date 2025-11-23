"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../../BaseModel");
const JoplinError_1 = require("../../JoplinError");
const Logger_1 = require("@joplin/utils/Logger");
const BaseItem_1 = require("../../models/BaseItem");
const logger = Logger_1.default.create('ItemUploader');
class ItemUploader {
    constructor(api, apiCall) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.preUploadedItems_ = {};
        this.preUploadedItemUpdatedTimes_ = {};
        this.maxBatchSize_ = 1 * 1024 * 1024; // 1MB;
        this.api_ = api;
        this.apiCall_ = apiCall;
    }
    get maxBatchSize() {
        return this.maxBatchSize_;
    }
    set maxBatchSize(v) {
        this.maxBatchSize_ = v;
    }
    async serializeAndUploadItem(ItemClass, path, local) {
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
            }
            else {
                const error = preUploadItem.error;
                if (error)
                    throw new JoplinError_1.default(error.message ? error.message : 'Unknown pre-upload error', error.code);
                return;
            }
        }
        const content = await ItemClass.serializeForSync(local);
        await this.apiCall_('put', path, content);
    }
    async preUploadItems(items) {
        if (!this.api_.supportsMultiPut)
            return;
        const itemsToUpload = [];
        for (const local of items) {
            // For resources, additional logic is necessary - in particular the blob
            // should be uploaded before the metadata, so we can't batch process.
            if (local.type_ === BaseModel_1.ModelType.Resource)
                continue;
            const ItemClass = BaseItem_1.default.itemClass(local);
            itemsToUpload.push({
                name: BaseItem_1.default.systemPath(local),
                body: await ItemClass.serializeForSync(local),
                localItemUpdatedTime: local.updated_time,
            });
        }
        let batchSize = 0;
        let currentBatch = [];
        const uploadBatch = async (batch) => {
            for (const batchItem of batch) {
                this.preUploadedItemUpdatedTimes_[batchItem.name] = batchItem.localItemUpdatedTime;
            }
            const response = await this.apiCall_('multiPut', batch);
            this.preUploadedItems_ = Object.assign(Object.assign({}, this.preUploadedItems_), response.items);
        };
        while (itemsToUpload.length) {
            const itemToUpload = itemsToUpload.pop();
            const itemSize = itemToUpload.name.length + itemToUpload.body.length;
            // Although it should be rare, if the item itself is above the
            // batch max size, we skip it. In that case it will be uploaded the
            // regular way when the synchronizer calls `serializeAndUploadItem()`
            if (itemSize > this.maxBatchSize)
                continue;
            if (batchSize + itemSize > this.maxBatchSize) {
                await uploadBatch(currentBatch);
                batchSize = itemSize;
                currentBatch = [itemToUpload];
            }
            else {
                batchSize += itemSize;
                currentBatch.push(itemToUpload);
            }
        }
        if (currentBatch.length)
            await uploadBatch(currentBatch);
    }
}
exports.default = ItemUploader;
