import { ModelType } from '@joplin/lib/BaseModel';
import { resourceBlobPath } from '../utils/joplinUtils';
import { Change, ChangeType, isUniqueConstraintError, Item, Share, ShareType, ShareUserStatus, User, Uuid } from '../db';
import { unique } from '../utils/array';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from '../utils/errors';
import { setQueryParameters } from '../utils/urlUtils';
import BaseModel, { AclAction, DeleteOptions, ValidateOptions } from './BaseModel';

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}

	public async checkIfAllowed(user: User, action: AclAction, resource: Share = null): Promise<void> {
		if (action === AclAction.Create) {
			if (!await this.models().item().userHasItem(user.id, resource.item_id)) throw new ErrorForbidden('cannot share an item not owned by the user');

			if (resource.type === ShareType.JoplinRootFolder) {
				const item = await this.models().item().loadByJopId(user.id, resource.folder_id);
				if (item.jop_parent_id) throw new ErrorForbidden('A shared notebook must be at the root');
			}
		}

		if (action === AclAction.Read) {
			if (user.id !== resource.owner_id) throw new ErrorForbidden('no access to this share');
		}

		if (action === AclAction.Delete) {
			if (user.id !== resource.owner_id) throw new ErrorForbidden('no access to this share');
		}
	}

	protected objectToApiOutput(object: Share): Share {
		const output: Share = {};

		if (object.id) output.id = object.id;
		if (object.type) output.type = object.type;
		if (object.folder_id) output.folder_id = object.folder_id;
		if (object.owner_id) output.owner_id = object.owner_id;
		if (object.note_id) output.note_id = object.note_id;

		return output;
	}

	protected async validate(share: Share, options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Link, ShareType.App, ShareType.JoplinRootFolder].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);
		if (share.type !== ShareType.Link && await this.itemIsShared(share.type, share.item_id)) throw new ErrorBadRequest('A shared item cannot be shared again');

		const item = await this.models().item().load(share.item_id);
		if (!item) throw new ErrorNotFound(`Could not find item: ${share.item_id}`);

		return super.validate(share, options);
	}

	public async createShare(userId: Uuid, shareType: ShareType, itemId: Uuid): Promise<Share> {
		const toSave: Share = {
			type: shareType,
			item_id: itemId,
			owner_id: userId,
		};

		return this.save(toSave);
	}

	public async itemShare(shareType: ShareType, itemId: string): Promise<Share> {
		return this
			.db(this.tableName)
			.select(this.defaultFields)
			.where('item_id', '=', itemId)
			.where('type', '=', shareType)
			.first();
	}

	public async itemIsShared(shareType: ShareType, itemId: string): Promise<boolean> {
		const r = await this.itemShare(shareType, itemId);
		return !!r;
	}

	public shareUrl(id: Uuid, query: any = null): string {
		return setQueryParameters(`${this.baseUrl}/shares/${id}`, query);
	}

	public async byItemId(itemId: Uuid): Promise<Share | null> {
		const r = await this.byItemIds([itemId]);
		return r.length ? r[0] : null;
	}

	public async byItemIds(itemIds: Uuid[]): Promise<Share[]> {
		return this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
	}

	public async byUserId(userId: Uuid, type: ShareType): Promise<Share[]> {
		const query1 = this
			.db(this.tableName)
			.select(this.defaultFields)
			.where('type', '=', type)
			.whereIn('id', this
				.db('share_users')
				.select('share_id')
				.where('user_id', '=', userId)
			);

		const query2 = this
			.db(this.tableName)
			.select(this.defaultFields)
			.where('type', '=', type)
			.where('owner_id', '=', userId);

		return query1.union(query2);
	}

	public async byUserAndItemId(userId: Uuid, itemId: Uuid): Promise<Share> {
		return this.db(this.tableName).select(this.defaultFields)
			.where('owner_id', '=', userId)
			.where('item_id', '=', itemId)
			.first();
	}

	public async sharesByUser(userId: Uuid, type: ShareType = null): Promise<Share[]> {
		const query = this.db(this.tableName)
			.select(this.defaultFields)
			.where('owner_id', '=', userId);

		if (type) void query.andWhere('type', '=', type);

		return query;
	}

	// Returns all user IDs concerned by the share. That includes all the users
	// the folder has been shared with, as well as the folder owner.
	public async allShareUserIds(share: Share): Promise<Uuid[]> {
		const shareUsers = await this.models().shareUser().byShareId(share.id, ShareUserStatus.Accepted);
		const userIds = shareUsers.map(su => su.user_id);
		userIds.push(share.owner_id);
		return userIds;
	}

	public async updateSharedItems3() {

		const addUserItem = async (shareUserId: Uuid, itemId: Uuid) => {
			try {
				await this.models().userItem().add(shareUserId, itemId);
			} catch (error) {
				if (!isUniqueConstraintError(error)) throw error;
			}
		};

		const removeUserItem = async (shareUserId: Uuid, itemId: Uuid) => {
			await this.models().userItem().remove(shareUserId, itemId);
		};

		const handleCreated = async (change: Change, item: Item, share: Share) => {
			// console.info('CREATE ITEM', item);
			// console.info('CHANGE', change);

			// if (![ModelType.Note, ModelType.Folder, ModelType.Resource].includes(item.jop_type)) return;
			if (!item.jop_share_id) return;

			const shareUserIds = await this.allShareUserIds(share);
			for (const shareUserId of shareUserIds) {
				if (shareUserId === change.user_id) continue;
				await addUserItem(shareUserId, item.id);

				if (item.jop_type === ModelType.Resource) {
					// const resourceItem = await this.models().item().loadByName(change.user_id, resourceBlobPath(
				}
			}
		};

		const handleUpdated = async (change: Change, item: Item, share: Share) => {
			const previousItem = this.models().change().unserializePreviousItem(change.previous_item);
			const previousShareId = previousItem.jop_share_id;
			const shareId = share ? share.id : '';

			if (previousShareId === shareId) return;

			const previousShare = previousShareId ? await this.models().share().load(previousShareId) : null;

			if (previousShare) {
				const shareUserIds = await this.allShareUserIds(previousShare);
				for (const shareUserId of shareUserIds) {
					if (shareUserId === change.user_id) continue;
					await removeUserItem(shareUserId, item.id);
				}
			}

			if (share) {
				const shareUserIds = await this.allShareUserIds(share);
				for (const shareUserId of shareUserIds) {
					if (shareUserId === change.user_id) continue;
					await addUserItem(shareUserId, item.id);
				}
			}
		};

		// This loop essentially applies the change made by one user to all the
		// other users in the share.
		//
		// While it's processing changes, it's going to create new user_item
		// objects, which in turn generate more Change items, which are processed
		// again. However there are guards to ensure that it doesn't result in
		// an infinite loop - in particular once a user_item has been added,
		// adding it again will result in a UNIQUE constraint error and thus it
		// won't generate a Change object the second time.
		//
		// Rather than checking if the user_item exists before creating it, we
		// create it directly and let it fail, while catching the Unique error.
		// This is probably safer in terms of avoiding race conditions and
		// possibly faster.

		while (true) {
			const latestProcessedChange = await this.models().keyValue().value<string>('ShareService::latestProcessedChange');

			const changes = await this.models().change().allFromId(latestProcessedChange || '');
			if (!changes.length) break;

			const items = await this.models().item().loadByIds(changes.map(c => c.item_id));
			const shareIds = unique(items.filter(i => !!i.jop_share_id).map(i => i.jop_share_id));
			const shares = await this.models().share().loadByIds(shareIds);

			await this.withTransaction(async () => {
				for (const change of changes) {
					const item = items.find(i => i.id === change.item_id);

					if (change.type === ChangeType.Create) {
						await handleCreated(change, item, shares.find(s => s.id === item.jop_share_id));
					}

					if (change.type === ChangeType.Update) {
						await handleUpdated(change, item, shares.find(s => s.id === item.jop_share_id));
					}

					// We don't need to handle ChangeType.Delete because when an
					// item is deleted, all its associated userItems are deleted
					// too.
				}

				await this.models().keyValue().setValue('ShareService::latestProcessedChange', changes[changes.length - 1].id);
			});
		}
	}

	// public async updateSharedItems2(userId: Uuid) {
	// 	const shares = await this.models().share().byUserId(userId, ShareType.JoplinRootFolder);
	// 	if (!shares.length) return;

	// 	const existingShareUserItems: UserItem[] = await this.models().userItem().itemsInShare(userId);

	// 	const allShareUserItems: UserItem[] = [];

	// 	for (const share of shares) {
	// 		allShareUserItems.push({
	// 			item_id: share.item_id,
	// 			share_id: share.id,
	// 		});

	// 		const shareUserIds = await this.models().share().allShareUserIds(share);
	// 		const shareItems = await this.models().item().sharedFolderChildrenItems(shareUserIds, share.folder_id);
	// 		for (const item of shareItems) {
	// 			allShareUserItems.push({
	// 				item_id: item.id,
	// 				share_id: share.id,
	// 			});
	// 		}
	// 	}

	// 	const userItemsToDelete: UserItem[] = [];
	// 	for (const userItem of existingShareUserItems) {
	// 		if (!allShareUserItems.find(ui => ui.item_id === userItem.item_id && ui.share_id === userItem.share_id)) {
	// 			userItemsToDelete.push(userItem);
	// 		}
	// 	}

	// 	const userItemsToCreate: UserItem[] = [];
	// 	for (const userItem of allShareUserItems) {
	// 		if (!existingShareUserItems.find(ui => ui.item_id === userItem.item_id && ui.share_id === userItem.share_id)) {
	// 			userItemsToCreate.push(userItem);
	// 		}
	// 	}

	// 	await this.withTransaction(async () => {
	// 		await this.models().userItem().deleteByUserItemIds(userItemsToDelete.map(ui => ui.id));

	// 		for (const userItem of userItemsToCreate) {
	// 			await this.models().userItem().add(userId, userItem.item_id, userItem.share_id);
	// 		}
	// 	});
	// }

	// public async updateSharedItems() {
	// 	enum ResourceChangeAction {
	// 		Added = 1,
	// 		Removed = 2,
	// 	}

	// 	interface ResourceChange {
	// 		resourceIds: string[];
	// 		share: Share;
	// 		change: Change;
	// 		action: ResourceChangeAction;
	// 	}

	// 	let resourceChanges: ResourceChange[] = [];

	// 	const getSharedRootInfo = async (jopId: string) => {
	// 		try {
	// 			const output = await this.models().item().joplinItemSharedRootInfo(jopId);
	// 			return output;
	// 		} catch (error) {
	// 			// "noPathForItem" means that the note or folder doesn't have a
	// 			// parent yet. It can happen because items are synchronized in
	// 			// random order, sometimes the children before the parents. In
	// 			// that case we simply ignore the error, which means that for
	// 			// now the share status of the item is unknown. The situation
	// 			// will be resolved when the parent is received because in this
	// 			// case, if the folder is within a shared folder, all its
	// 			// children will be shared.
	// 			if (error.code === 'noPathForItem') return null;
	// 			throw error;
	// 		}
	// 	};

	// 	const handleAddedToSharedFolder = async (item: Item, shareInfo: SharedRootInfo) => {
	// 		const userIds = await this.allShareUserIds(shareInfo.share);

	// 		for (const userId of userIds) {
	// 			// If it's a folder we share its content. This is to ensure
	// 			// that children that were synced before their parents get their
	// 			// share status updated.
	// 			// if (item.jop_type === ModelType.Folder) {
	// 			// 	await this.models().item().shareJoplinFolderAndContent(shareInfo.share.id, shareInfo.share.owner_id, userId, item.jop_id);
	// 			// }

	// 			try {
	// 				await this.models().userItem().add(userId, item.id);
	// 			} catch (error) {
	// 				if (isUniqueConstraintError(error)) {
	// 					// Ignore - it means this user already has this item
	// 				} else {
	// 					throw error;
	// 				}
	// 			}
	// 		}
	// 	};

	// 	const handleRemovedFromSharedFolder = async (change: Change, item: Item, shareInfo: SharedRootInfo) => {
	// 		// This is called when a note parent ID changes and is moved out of
	// 		// the shared folder. In that case, we need to unshare the item from
	// 		// all users, except the one who did the action.
	// 		//
	// 		// - User 1 shares a folder with user 2
	// 		// - User 2 moves a note out of the shared folder
	// 		// - User 1 should no longer see the note. User 2 still sees it
	// 		//   since they have moved it to one of their own folders.

	// 		const userIds = await this.allShareUserIds(shareInfo.share);

	// 		for (const userId of userIds) {
	// 			if (change.user_id !== userId) {
	// 				await this.models().userItem().remove(userId, item.id);
	// 			}
	// 		}
	// 	};

	// 	const handleResourceSharing = async (change: Change, previousItem: ChangePreviousItem, item: Item, previousShareInfo: SharedRootInfo, currentShareInfo: SharedRootInfo) => {
	// 		// Not a note - we can exit
	// 		if (item.jop_type !== ModelType.Note) return;

	// 		// Item was not in a shared folder and is still not in one - nothing to do
	// 		if (!previousShareInfo && !currentShareInfo) return;

	// 		// Item was moved out of a shared folder to a non-shared folder - unshare all resources
	// 		if (previousShareInfo && !currentShareInfo) {
	// 			resourceChanges.push({
	// 				action: ResourceChangeAction.Removed,
	// 				change,
	// 				share: previousShareInfo.share,
	// 				resourceIds: await this.models().itemResource().byItemId(item.id),
	// 			});
	// 			return;
	// 		}

	// 		// Item was moved from a non-shared folder to a shared one - share all resources
	// 		if (!previousShareInfo && currentShareInfo) {
	// 			resourceChanges.push({
	// 				action: ResourceChangeAction.Added,
	// 				change,
	// 				share: currentShareInfo.share,
	// 				resourceIds: await this.models().itemResource().byItemId(item.id),
	// 			});
	// 			return;
	// 		}

	// 		// Note either stayed in the same shared folder, or moved to another
	// 		// shared folder. In that case, we check the note content before and
	// 		// after and see if resources have been added or removed from it,
	// 		// then we share/unshare resources based on this.

	// 		const previousResourceIds = previousItem ? previousItem.jop_resource_ids : [];
	// 		const currentResourceIds = await this.models().itemResource().byItemId(item.id);
	// 		for (const resourceId of previousResourceIds) {
	// 			if (!currentResourceIds.includes(resourceId)) {
	// 				resourceChanges.push({
	// 					action: ResourceChangeAction.Removed,
	// 					change,
	// 					share: currentShareInfo.share,
	// 					resourceIds: [resourceId],
	// 				});
	// 			}
	// 		}

	// 		for (const resourceId of currentResourceIds) {
	// 			if (!previousResourceIds.includes(resourceId)) {
	// 				resourceChanges.push({
	// 					action: ResourceChangeAction.Added,
	// 					change,
	// 					share: currentShareInfo.share,
	// 					resourceIds: [resourceId],
	// 				});
	// 			}
	// 		}
	// 	};

	// 	const handleCreatedItem = async (change: Change, item: Item) => {
	// 		if (!item.jop_parent_id) return;
	// 		const shareInfo = await getSharedRootInfo(item.jop_parent_id);

	// 		if (!shareInfo) return;

	// 		await handleResourceSharing(change, null, item, null, shareInfo);
	// 		await handleAddedToSharedFolder(item, shareInfo);
	// 	};

	// 	const handleUpdatedItem = async (change: Change, item: Item) => {
	// 		if (![ModelType.Note, ModelType.Folder].includes(item.jop_type)) return;

	// 		const previousItem = this.models().change().unserializePreviousItem(change.previous_item);

	// 		const previousShareInfo = previousItem?.jop_parent_id ? await getSharedRootInfo(previousItem.jop_parent_id) : null;
	// 		const currentShareInfo = item.jop_parent_id ? await getSharedRootInfo(item.jop_parent_id) : null;

	// 		await handleResourceSharing(change, previousItem, item, previousShareInfo, currentShareInfo);

	// 		// Item was not in a shared folder and is still not in one
	// 		if (!previousShareInfo && !currentShareInfo) return;

	// 		// Item was in a shared folder and is still in the same shared folder
	// 		if (previousShareInfo && currentShareInfo && previousShareInfo.item.jop_parent_id === currentShareInfo.item.jop_parent_id) return;

	// 		// Item was not previously in a shared folder but has been moved to one
	// 		if (!previousShareInfo && currentShareInfo) {
	// 			await handleAddedToSharedFolder(item, currentShareInfo);
	// 			return;
	// 		}

	// 		// Item was in a shared folder and is no longer in one
	// 		if (previousShareInfo && !currentShareInfo) {
	// 			await handleRemovedFromSharedFolder(change, item, previousShareInfo);
	// 			return;
	// 		}

	// 		// Item was in a shared folder and has been moved to a different shared folder
	// 		if (previousShareInfo && currentShareInfo && previousShareInfo.item.jop_parent_id !== currentShareInfo.item.jop_parent_id) {
	// 			await handleRemovedFromSharedFolder(change, item, previousShareInfo);
	// 			await handleAddedToSharedFolder(item, currentShareInfo);
	// 			return;
	// 		}

	// 		// Sanity check - because normally all cases are covered above
	// 		throw new Error('Unreachable');
	// 	};

	// 	// This loop essentially applies the change made by one user to all the
	// 	// other users in the share.
	// 	//
	// 	// While it's processing changes, it's going to create new user_item
	// 	// objects, which in turn generate more Change items, which are processed
	// 	// again. However there are guards to ensure that it doesn't result in
	// 	// an infinite loop - in particular once a user_item has been added,
	// 	// adding it again will result in a UNIQUE constraint error and thus it
	// 	// won't generate a Change object the second time.
	// 	//
	// 	// Rather than checking if the user_item exists before creating it, we
	// 	// create it directly and let it fail, while catching the Unique error.
	// 	// This is probably safer in terms of avoiding race conditions and
	// 	// possibly faster.

	// 	while (true) {
	// 		const latestProcessedChange = await this.models().keyValue().value<string>('ShareService::latestProcessedChange');

	// 		const changes = await this.models().change().allFromId(latestProcessedChange || '');
	// 		if (!changes.length) break;

	// 		const items = await this.models().item().loadByIds(changes.map(c => c.item_id));

	// 		await this.withTransaction(async () => {
	// 			for (const change of changes) {
	// 				if (change.type === ChangeType.Create) {
	// 					await handleCreatedItem(change, items.find(i => i.id === change.item_id));
	// 				}

	// 				if (change.type === ChangeType.Update) {
	// 					await handleUpdatedItem(change, items.find(i => i.id === change.item_id));
	// 				}

	// 				// We don't need to handle ChangeType.Delete because when an
	// 				// item is deleted, all its associated userItems are deleted
	// 				// too.
	// 			}

	// 			for (const rc of resourceChanges) {
	// 				const shareUserIds = await this.allShareUserIds(rc.share);
	// 				const doShare = rc.action === ResourceChangeAction.Added;
	// 				const changerUserId = rc.change.user_id;

	// 				for (const shareUserId of shareUserIds) {
	// 					// We apply the updates to all the users, except the one
	// 					// who made the change, since they already have the
	// 					// change.
	// 					if (shareUserId === changerUserId) continue;
	// 					await this.updateResourceShareStatus(doShare, rc.share.id, changerUserId, shareUserId, rc.resourceIds);
	// 				}
	// 			}

	// 			resourceChanges = [];

	// 			await this.models().keyValue().setValue('ShareService::latestProcessedChange', changes[changes.length - 1].id);
	// 		});
	// 	}
	// }

	public async updateResourceShareStatus(doShare: boolean, _shareId: Uuid, changerUserId: Uuid, toUserId: Uuid, resourceIds: string[]) {
		const resourceItems = await this.models().item().loadByJopIds(changerUserId, resourceIds);
		const resourceBlobNames = resourceIds.map(id => resourceBlobPath(id));
		const resourceBlobItems = await this.models().item().loadByNames(changerUserId, resourceBlobNames);

		for (const resourceItem of resourceItems) {
			if (doShare) {
				try {
					await this.models().userItem().add(toUserId, resourceItem.id);
				} catch (error) {
					if (isUniqueConstraintError(error)) {
						continue;
					}
					throw error;
				}
			} else {
				await this.models().userItem().remove(toUserId, resourceItem.id);
			}
		}

		for (const resourceBlobItem of resourceBlobItems) {
			if (doShare) {
				try {
					await this.models().userItem().add(toUserId, resourceBlobItem.id);
				} catch (error) {
					if (isUniqueConstraintError(error)) {
						continue;
					}
					throw error;
				}
			} else {
				await this.models().userItem().remove(toUserId, resourceBlobItem.id);
			}
		}
	}

	// That should probably only be called when a user accepts the share
	// invitation. At this point, we want to share all the items immediately.
	// Afterwards, items that are added or removed are processed by the share
	// service.
	public async createSharedFolderUserItems(shareId: Uuid, userId: Uuid) {
		const items = await this.models().item().byShareId(shareId, { fields: ['id'] });

		await this.withTransaction(async () => {
			for (const item of items) {
				await this.models().userItem().add(userId, item.id);
			}
		});
	}

	public async shareFolder(owner: User, folderId: string): Promise<Share> {
		const folderItem = await this.models().item().loadByJopId(owner.id, folderId);
		if (!folderItem) throw new ErrorNotFound(`No such folder: ${folderId}`);

		const share = await this.models().share().byUserAndItemId(owner.id, folderItem.id);
		if (share) return share;

		const shareToSave = {
			type: ShareType.JoplinRootFolder,
			item_id: folderItem.id,
			owner_id: owner.id,
			folder_id: folderId,
		};

		await this.checkIfAllowed(owner, AclAction.Create, shareToSave);

		// const shareItems = await this.models().item().sharedFolderChildrenItems([owner.id], folderId);
		// const userItems = await this.models().userItem().byItemIds(shareItems.map(s => s.id));
		// const userItemIds = userItems.map(u => u.id);

		return super.save(shareToSave);

		// return this.withTransaction(async () => {
		// 	const savedShare = await super.save(shareToSave);

		// 	await this
		// 		.db('user_items')
		// 		.whereIn('id', userItemIds)
		// 		.orWhere('item_id', '=', shareToSave.item_id)
		// 		.update({ share_id: savedShare.id });

		// 	return savedShare;
		// });
	}

	public async shareNote(owner: User, noteId: string): Promise<Share> {
		const noteItem = await this.models().item().loadByJopId(owner.id, noteId);
		if (!noteItem) throw new ErrorNotFound(`No such note: ${noteId}`);

		const shareToSave = {
			type: ShareType.Link,
			item_id: noteItem.id,
			owner_id: owner.id,
			note_id: noteId,
		};

		await this.checkIfAllowed(owner, AclAction.Create, shareToSave);

		return this.save(shareToSave);
	}

	public async delete(id: string | string[], options: DeleteOptions = {}): Promise<void> {
		const ids = typeof id === 'string' ? [id] : id;
		const shares = await this.loadByIds(ids);

		await this.withTransaction(async () => {
			for (const share of shares) {
				await this.models().shareUser().deleteByShare(share);
				await this.models().userItem().deleteByShare({ id: share.id, owner_id: share.owner_id });
				await super.delete(share.id, options);
			}
		}, 'ShareModel::delete');
	}

}
