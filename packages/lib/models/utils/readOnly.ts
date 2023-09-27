import { ModelType } from '../../BaseModel';
import { ErrorCode } from '../../errors';
import JoplinError from '../../JoplinError';
import { State as ShareState } from '../../services/share/reducer';
import ItemChange from '../ItemChange';
import Setting from '../Setting';

export interface ItemSlice {
	id?: string;
	share_id: string;
}

// This function can be called to wrap any read-only-related code. It should be
// fast and allows an early exit for cases that don't apply, for example if not
// synchronising with Joplin Cloud or if not sharing any notebook.
export const needsReadOnlyChecks = (itemType: ModelType, changeSource: number, shareState: ShareState, disableReadOnlyCheck = false) => {
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
	if (!needsReadOnlyChecks(itemType, changeSource, shareState)) return;
	if (!item) return;

	if (itemIsReadOnlySync(itemType, changeSource, item, Setting.value('sync.userId'), shareState)) {
		throw new JoplinError(`Cannot change or delete a read-only item: ${item.id}`, ErrorCode.IsReadOnly);
	}
};

export const checkIfItemCanBeAddedToFolder = async (itemType: ModelType, Folder: any, changeSource: number, shareState: ShareState, parentId: string) => {
	if (needsReadOnlyChecks(itemType, changeSource, shareState) && parentId) {
		const parentFolder = await Folder.load(parentId, { fields: ['id', 'share_id'] });
		if (itemIsReadOnlySync(itemType, changeSource, parentFolder, Setting.value('sync.userId'), shareState)) {
			throw new JoplinError('Cannot add an item as a child of a read-only item', ErrorCode.IsReadOnly);
		}
	}
};

export const itemIsReadOnlySync = (itemType: ModelType, changeSource: number, item: ItemSlice, userId: string, shareState: ShareState): boolean => {
	if (!needsReadOnlyChecks(itemType, changeSource, shareState)) return false;

	if (!('share_id' in item)) throw new Error('share_id property is missing');

	// Item is not shared
	if (!item.share_id) return false;

	// Item belongs to the user
	if (shareState.shares.find(s => s.user.id === userId)) return false;

	const shareUser = shareState.shareInvitations.find(si => si.share.id === item.share_id);

	// Shouldn't happen
	if (!shareUser) return false;

	return !shareUser.can_write;
};

export const itemIsReadOnly = async (BaseItem: any, itemType: ModelType, changeSource: number, itemId: string, userId: string, shareState: ShareState): Promise<boolean> => {
	if (!needsReadOnlyChecks(itemType, changeSource, shareState)) return false;
	const item: ItemSlice = await BaseItem.loadItem(itemType, itemId, { fields: ['id', 'share_id'] });
	if (!item) throw new JoplinError(`No such item: ${itemType}: ${itemId}`, ErrorCode.NotFound);
	return itemIsReadOnlySync(itemType, changeSource, item, userId, shareState);
};
