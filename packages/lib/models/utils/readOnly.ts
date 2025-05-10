import Logger from '@joplin/utils/Logger';
import { ModelType } from '../../BaseModel';
import { ErrorCode } from '../../errors';
import JoplinError from '../../JoplinError';
import { State as ShareState } from '../../services/share/reducer';
import ItemChange from '../ItemChange';
import Setting from '../Setting';
import { checkObjectHasProperties } from '@joplin/utils/object';
import isTrashableItem from '../../services/trash/isTrashableItem';

const logger = Logger.create('models/utils/readOnly');

export interface ItemSlice {
	id?: string;
	share_id: string;
	deleted_time: number;
}

// This function can be called to wrap code that related to share permission read-only checks. It
// should be fast and allows an early exit for cases that don't apply, for example if not
// synchronising with Joplin Cloud or if not sharing any notebook.
export const needsShareReadOnlyChecks = (itemType: ModelType, changeSource: number, shareState: ShareState, disableReadOnlyCheck = false) => {
	if (disableReadOnlyCheck) return false;
	if (Setting.value('sync.target') !== 10) return false;
	if (changeSource === ItemChange.SOURCE_SYNC) return false;
	if (!Setting.value('sync.userId')) return false;
	if (![ModelType.Note, ModelType.Folder, ModelType.Resource].includes(itemType)) return false;

	if (!shareState) throw new Error('Share state must be provided');
	if (!shareState.shareInvitations.length) return false;
	return true;
};

export const checkIfItemsCanBeChanged = (itemType: ModelType, changeSource: number, items: ItemSlice[], shareState: ShareState) => {
	for (const item of items) {
		checkIfItemCanBeChanged(itemType, changeSource, item, shareState);
	}
};

export const checkIfItemCanBeChanged = (itemType: ModelType, changeSource: number, item: ItemSlice, shareState: ShareState) => {
	if (!needsShareReadOnlyChecks(itemType, changeSource, shareState)) return;
	if (!item) return;

	if (itemIsReadOnlySync(itemType, changeSource, item, Setting.value('sync.userId'), shareState, true)) {
		throw new JoplinError(`Cannot change or delete a read-only item: ${item.id}`, ErrorCode.IsReadOnly);
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const checkIfItemCanBeAddedToFolder = async (itemType: ModelType, Folder: any, changeSource: number, shareState: ShareState, parentId: string) => {
	if (needsShareReadOnlyChecks(itemType, changeSource, shareState) && parentId) {
		const parentFolder = await Folder.load(parentId, { fields: ['id', 'share_id'] });

		if (!parentFolder) {
			// Historically it's always been possible to set the parent_id of a
			// note to a folder that does not exist - this is to support
			// synchronisation, where items are downloaded in random order. It
			// is not ideal to skip the check here, but if for some reason the
			// folder turns out to be read-only the issue will be resolved
			// during sync.
			logger.warn('checkIfItemCanBeAddedToFolder: Trying to add an item to a folder that does not exist - skipping check');
			return;
		}

		if (itemIsReadOnlySync(itemType, changeSource, parentFolder, Setting.value('sync.userId'), shareState, true)) {
			throw new JoplinError('Cannot add an item as a child of a read-only item', ErrorCode.IsReadOnly);
		}
	}
};

// Originally all these functions were there to handle share permissions - a note, folder or
// resource that is not editable would be read-only. However this particular function now is also
// used to tell if a note is read-only because it is in the trash.
//
// But this requires access to more properties, `deleted_time` in particular, which are not needed
// for share-related checks (and does not exist on Resource objects). So this is why there's this
// extra `sharePermissionCheckOnly` boolean to do the check for one case or the other. A bit of a
// hack but good enough for now.
export const itemIsReadOnlySync = (itemType: ModelType, changeSource: number, item: ItemSlice, userId: string, shareState: ShareState, sharePermissionCheckOnly = false): boolean => {
	if (!sharePermissionCheckOnly && isTrashableItem(itemType, item)) {
		checkObjectHasProperties(item, ['deleted_time']);
	}

	// Item is in trash
	if (!sharePermissionCheckOnly && item.deleted_time) return true;

	if (!needsShareReadOnlyChecks(itemType, changeSource, shareState)) return false;

	checkObjectHasProperties(item, ['share_id']);

	// Item is not shared
	if (!item.share_id) return false;

	// Item belongs to the user
	const parentShare = shareState.shares.find(s => s.id === item.share_id);
	if (parentShare && parentShare.user?.id === userId) return false;

	const shareUser = shareState.shareInvitations.find(si => si.share.id === item.share_id);

	// Shouldn't happen
	if (!shareUser) return false;

	return !shareUser.can_write;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const itemIsReadOnly = async (BaseItem: any, itemType: ModelType, changeSource: number, itemId: string, userId: string, shareState: ShareState): Promise<boolean> => {
	// if (!needsShareReadOnlyChecks(itemType, changeSource, shareState)) return false;
	const item: ItemSlice = await BaseItem.loadItem(itemType, itemId, { fields: ['id', 'share_id', 'deleted_time'] });
	if (!item) throw new JoplinError(`No such item: ${itemType}: ${itemId}`, ErrorCode.NotFound);
	return itemIsReadOnlySync(itemType, changeSource, item, userId, shareState);
};
