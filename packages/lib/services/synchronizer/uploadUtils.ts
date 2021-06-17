import { ModelType } from '../../BaseModel';
import BaseItem, { ItemThatNeedSync } from '../../models/BaseItem';
import TaskQueue from '../../TaskQueue';

type UploadItem = (path: string, content: any)=> Promise<any>;

export async function serializeAndUploadItem(uploadItem: UploadItem, uploadQueue: TaskQueue, ItemClass: any, path: string, local: ItemThatNeedSync) {
	if (uploadQueue && uploadQueue.taskExists(path)) {
		return uploadQueue.taskResult(path);
	}

	const content = await ItemClass.serializeForSync(local);
	return uploadItem(path, content);
}

export async function preUploadItems(uploadItem: UploadItem, uploadQueue: TaskQueue, items: ItemThatNeedSync[]) {
	for (const local of items) {
		// For resources, additional logic is necessary - in particular the blob
		// should be uploaded before the metadata, so we can't batch process.
		if (local.type_ === ModelType.Resource) continue;

		const ItemClass = BaseItem.itemClass(local);
		const path = BaseItem.systemPath(local);
		uploadQueue.push(path, async () => {
			await serializeAndUploadItem(uploadItem, null, ItemClass, path, local);
		});
	}

	await uploadQueue.waitForAll();
}
