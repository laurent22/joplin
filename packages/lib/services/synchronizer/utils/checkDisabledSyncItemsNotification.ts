import { Dispatch } from 'redux';
import Resource from '../../../models/Resource';
import BaseItem from '../../../models/BaseItem';
import Setting from '../../../models/Setting';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('checkDisabledSyncItemsNotification');

export default async (dispatch: Dispatch) => {
	const heldBackSyncItems = await BaseItem.plaintextUploadHeldBackSyncItems(Setting.value('sync.target'));
	dispatch({
		type: 'SYNC_PLAINTEXT_UPLOAD_HELD_BACK_ITEMS_SET',
		itemIds: heldBackSyncItems.filter(syncItem => !syncItem.sync_warning_ignored).map(syncItem => syncItem.item_id),
	});

	const errorCount = await Resource.downloadStatusCounts(Resource.FETCH_STATUS_ERROR);
	if (errorCount) {
		logger.info(`${errorCount} resource download errors: Triggering notification`);
		dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
		return;
	}

	const disabledCount = await BaseItem.syncDisabledItemsCount(Setting.value('sync.target'));
	if (disabledCount) {
		logger.info(`${disabledCount} disabled sync items: Triggering notification`);
		dispatch({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS' });
		return;
	}

	logger.info('No errors: Hiding notification');

	dispatch({
		type: 'SYNC_HAS_DISABLED_SYNC_ITEMS',
		value: false,
	});
};
