import { Dispatch } from 'redux';
import BaseModel, { ModelType } from '../../../BaseModel';
import BaseItem from '../../../models/BaseItem';
import ItemChange from '../../../models/ItemChange';
import Resource from '../../../models/Resource';
import time from '../../../time';
import resourceRemotePath from './resourceRemotePath';
import { ApiCallFunction, LogSyncOperationFunction, SyncAction } from './types';
import { FileApi } from '../../../file-api';
import Logger from '@joplin/utils/Logger';
import { DeletedItemEntity } from '../../database/types';
const logger = Logger.create('syncDeleteStep');

export default async (
	syncTargetId: number,
	cancelling: ()=> boolean,
	logSyncOperation: LogSyncOperationFunction,
	apiCall: ApiCallFunction,
	api: FileApi,
	dispatch: Dispatch,
) => {
	const supportsBatchDelete = api.supportsMultiDelete;
	let toDelete = await BaseItem.deletedItems(syncTargetId);

	if (supportsBatchDelete) {
		toDelete = await batchDeleteStep(toDelete, syncTargetId, cancelling, apiCall, logSyncOperation);
	}

	for (let i = 0; i < toDelete.length; i++) {
		if (cancelling()) break;

		const item = toDelete[i];
		const path = systemPath(item);
		const isResource = item.item_type === BaseModel.TYPE_RESOURCE;

		try {
			await apiCall('delete', path);

			if (isResource) {
				const remoteContentPath = resourceRemotePath(item.item_id);
				await apiCall('delete', remoteContentPath);
			}

			logSyncOperation(SyncAction.DeleteRemote, null, { id: item.item_id }, 'local has been deleted');
		} catch (error) {
			if (error.code === 'isReadOnly') {
				let remoteContent = await apiCall('get', path);

				if (remoteContent) {
					remoteContent = await BaseItem.unserialize(remoteContent);
					const ItemClass = BaseItem.itemClass(item.item_type);
					// For remote deletion, remoteItemUpdatedTime can be reset to 0
					let nextQueries = BaseItem.updateSyncTimeQueries(syncTargetId, remoteContent, time.unixMs());

					if (isResource) {
						nextQueries = nextQueries.concat(Resource.setLocalStateQueries(remoteContent.id, {
							fetch_status: Resource.FETCH_STATUS_IDLE,
						}));
					}

					await ItemClass.save(remoteContent, { isNew: true, autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries });

					if (isResource) dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: remoteContent.id });
				}
			} else {
				throw error;
			}
		}

		await BaseItem.remoteDeletedItems(syncTargetId, [item.item_id]);
	}
};

const systemPath = (deletedItem: DeletedItemEntity) => BaseItem.systemPath(deletedItem.item_id);
const isReadOnlyError = (error: Error) => 'code' in error && error.code === 'isReadOnly';
const isNotFoundError = (error: Error) => 'httpCode' in error && error.httpCode === 404;
const isNotSupportedError = (error: Error) => 'code' in error && error.code === 'methodNotSupported';

const batchDeleteStep = async (
	toDelete: DeletedItemEntity[],
	syncTargetId: number,
	cancellingSync: ()=> boolean,
	apiCall: ApiCallFunction,
	logSyncOperation: LogSyncOperationFunction,
) => {
	let supported = true;
	const cancelling = () => {
		return !supported || cancellingSync();
	};
	const needsIndividualDelete: DeletedItemEntity[] = [];
	const handleError = (error: Error, items: DeletedItemEntity[]) => {
		if (!isReadOnlyError(error) && !isNotFoundError(error) && !isNotSupportedError(error)) {
			logger.warn('Failed to batch delete item(s)', items.map(item => item.item_id), error, 'Retrying with individual item deletion...');
		}
		if (isNotSupportedError(error)) {
			logger.info('Batch deletion not supported');
			supported = false;
		}
		needsIndividualDelete.push(...items);
	};

	const batchSize = 20;
	for (let i = 0; i < toDelete.length; i += batchSize) {
		const batch = toDelete.slice(i, i + batchSize);
		if (cancelling()) {
			needsIndividualDelete.push(...batch);
			continue;
		}

		const paths = [];
		const pathToItems = new Map<string, DeletedItemEntity>();
		for (const item of batch) {
			const itemPath = systemPath(item);
			paths.push(itemPath);
			pathToItems.set(itemPath, item);

			if (item.item_type === ModelType.Resource) {
				const resourcePath = resourceRemotePath(item.item_id);
				paths.push(resourcePath);
				pathToItems.set(resourcePath, item);
			}
		}

		try {
			const response = await apiCall('multiDelete', paths);
			const itemsResponse = response.items as Record<string, { error?: Error }>;
			const successfulItems = [];
			for (const [itemName, { error }] of Object.entries(itemsResponse)) {
				const item = pathToItems.get(itemName);
				const isSuccessful = !error || isNotFoundError(error);
				if (!isSuccessful) {
					handleError(error, [item]);
				} else {
					successfulItems.push(item);
					logSyncOperation(SyncAction.DeleteRemote, null, { id: item.item_id }, 'local has been deleted');
				}
			}
			await BaseItem.remoteDeletedItems(syncTargetId, successfulItems.map(item => item.item_id));
		} catch (error) {
			handleError(error, batch);
		}
	}

	return needsIndividualDelete;
};
