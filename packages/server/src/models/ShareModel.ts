import { resourceBlobPath } from '../utils/joplinUtils';
import { Change, ChangeType, Item, Share, ShareType, ShareUserStatus, User, Uuid } from '../services/database/types';
import { unique } from '../utils/array';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from '../utils/errors';
import { setQueryParameters } from '../utils/urlUtils';
import BaseModel, { AclAction, DeleteOptions, ValidateOptions } from './BaseModel';
import { userIdFromUserContentUrl } from '../utils/routeUtils';
import { getCanShareFolder } from './utils/user';
import { isUniqueConstraintError } from '../db';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('ShareModel');

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}

	public async checkIfAllowed(user: User, action: AclAction, resource: Share = null): Promise<void> {
		if (action === AclAction.Create) {
			if (resource.type === ShareType.Folder && !getCanShareFolder(user)) throw new ErrorForbidden('The sharing feature is not enabled for this account');

			// Note that currently all users can always share notes by URL so
			// there's no check on the permission

			if (!await this.models().item().userHasItem(user.id, resource.item_id)) throw new ErrorForbidden('cannot share an item not owned by the user');

			if (resource.type === ShareType.Folder) {
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

	public checkShareUrl(share: Share, shareUrl: string) {
		if (this.baseUrl === this.userContentBaseUrl) return; // OK

		const userId = userIdFromUserContentUrl(shareUrl);
		const shareUserId = share.owner_id.toLowerCase();

		if (userId.length >= 10 && shareUserId.indexOf(userId) === 0) {
			// OK
		} else {
			throw new ErrorBadRequest('Invalid origin (User Content)');
		}
	}

	protected objectToApiOutput(object: Share): Share {
		const output: Share = {};

		if (object.id) output.id = object.id;
		if (object.type) output.type = object.type;
		if (object.folder_id) output.folder_id = object.folder_id;
		if (object.owner_id) output.owner_id = object.owner_id;
		if (object.note_id) output.note_id = object.note_id;
		if (object.master_key_id) output.master_key_id = object.master_key_id;

		return output;
	}

	protected async validate(share: Share, options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Note, ShareType.Folder].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);
		if (share.type !== ShareType.Note && await this.itemIsShared(share.type, share.item_id)) throw new ErrorBadRequest('A shared item cannot be shared again');

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

	public shareUrl(shareOwnerId: Uuid, id: Uuid, query: any = null): string {
		return setQueryParameters(`${this.personalizedUserContentBaseUrl(shareOwnerId)}/shares/${id}`, query);
	}

	public async byItemId(itemId: Uuid): Promise<Share | null> {
		const r = await this.byItemIds([itemId]);
		return r.length ? r[0] : null;
	}

	public async byItemIds(itemIds: Uuid[]): Promise<Share[]> {
		return this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
	}

	public async byItemAndRecursive(itemId: Uuid, recursive: boolean): Promise<Share | null> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where('item_id', itemId)
			.where('recursive', recursive ? 1 : 0)
			.first();
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

	public async participatedSharesByUser(userId: Uuid, type: ShareType = null): Promise<Share[]> {
		const query = this.db(this.tableName)
			.select(this.defaultFields)
			.whereIn('id', this.db('share_users')
				.select('share_id')
				.where('user_id', '=', userId)
				.andWhere('status', '=', ShareUserStatus.Accepted
				));

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
				await this.models().userItem().add(shareUserId, itemId, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
			} catch (error) {
				if (!isUniqueConstraintError(error)) throw error;
			}
		};

		const removeUserItem = async (shareUserId: Uuid, itemId: Uuid) => {
			await this.models().userItem().remove(shareUserId, itemId);
		};

		const handleCreated = async (change: Change, item: Item, share: Share) => {
			if (!item.jop_share_id) return;

			// When a folder is unshared, the share object is deleted, then all
			// items that were shared get their 'share_id' property set to an
			// empty string. This is all done client side.
			//
			// However it means that if a share object is deleted but the items
			// are not synced, we'll find items that are associated with a share
			// that no longer exists. This is fine, but we need to handle it
			// properly below, otherwise the share update process will fail.

			if (!share) {
				logger.warn(`Found an item (${item.id}) associated with a share that no longer exists (${item.jop_share_id}) - skipping it`);
				return;
			}

			const shareUserIds = await this.allShareUserIds(share);
			for (const shareUserId of shareUserIds) {
				if (shareUserId === change.user_id) continue;
				await addUserItem(shareUserId, item.id);
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
					try {
						await removeUserItem(shareUserId, item.id);
					} catch (error) {
						if (error.httpCode === ErrorNotFound.httpCode) {
							logger.warn('Could not remove a user item because it has already been removed:', error);
						} else {
							throw error;
						}
					}
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

		// This function add any missing item to a user's collection. Normally
		// it shouldn't be necessary since items are added or removed based on
		// the Change events, but it seems it can happen anyway, possibly due to
		// a race condition somewhere. So this function corrects this by
		// re-assigning any missing items.
		//
		// It should be relatively quick to call since it's restricted to shares
		// that have recently changed, and the performed SQL queries are
		// index-based.
		const checkForMissingUserItems = async (shares: Share[]) => {
			for (const share of shares) {
				const realShareItemCount = await this.itemCountByShareId(share.id);
				const shareItemCountPerUser = await this.itemCountByShareIdPerUser(share.id);

				for (const row of shareItemCountPerUser) {
					if (row.item_count < realShareItemCount) {
						logger.warn(`checkForMissingUserItems: User is missing some items: Share ${share.id}: User ${row.user_id}`);
						await this.createSharedFolderUserItems(share.id, row.user_id);
					} else if (row.item_count > realShareItemCount) {
						// Shouldn't be possible but log it just in case
						logger.warn(`checkForMissingUserItems: User has too many items (??): Share ${share.id}: User ${row.user_id}`);
					}
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

			const paginatedChanges = await this.models().change().allFromId(latestProcessedChange || '');
			const changes = paginatedChanges.items;

			if (!changes.length) {
				await this.models().keyValue().setValue('ShareService::latestProcessedChange', paginatedChanges.cursor);
			} else {
				const items = await this.models().item().loadByIds(changes.map(c => c.item_id));
				const shareIds = unique(items.filter(i => !!i.jop_share_id).map(i => i.jop_share_id));
				const shares = await this.models().share().loadByIds(shareIds);

				await this.withTransaction(async () => {
					for (const change of changes) {
						const item = items.find(i => i.id === change.item_id);

						// Item associated with the change may have been
						// deleted, so take this into account.
						if (item) {
							const itemShare = shares.find(s => s.id === item.jop_share_id);

							if (change.type === ChangeType.Create) {
								await handleCreated(change, item, itemShare);
							}

							if (change.type === ChangeType.Update) {
								await handleUpdated(change, item, itemShare);
							}
						}

						// We don't need to handle ChangeType.Delete because when an
						// item is deleted, all its associated userItems are deleted
						// too.
					}

					await checkForMissingUserItems(shares);

					await this.models().keyValue().setValue('ShareService::latestProcessedChange', paginatedChanges.cursor);
				}, 'ShareService::updateSharedItems3');
			}

			if (!paginatedChanges.has_more) break;
		}
	}

	public async updateResourceShareStatus(doShare: boolean, _shareId: Uuid, changerUserId: Uuid, toUserId: Uuid, resourceIds: string[]) {
		const resourceItems = await this.models().item().loadByJopIds(changerUserId, resourceIds);
		const resourceBlobNames = resourceIds.map(id => resourceBlobPath(id));
		const resourceBlobItems = await this.models().item().loadByNames(changerUserId, resourceBlobNames);

		for (const resourceItem of resourceItems) {
			if (doShare) {
				try {
					await this.models().userItem().add(toUserId, resourceItem.id, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
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
					await this.models().userItem().add(toUserId, resourceBlobItem.id, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
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

	// The items that are added or removed from a share are processed by the
	// share service, and added as user_utems to each user. This function
	// however can be called after a user accept a share, or to correct share
	// errors, but re-assigning all items to a user.
	public async createSharedFolderUserItems(shareId: Uuid, userId: Uuid) {
		const query = this.models().item().byShareIdQuery(shareId, { fields: ['id', 'name'] });
		await this.models().userItem().addMulti(userId, query);
	}

	public async shareFolder(owner: User, folderId: string, masterKeyId: string): Promise<Share> {
		const folderItem = await this.models().item().loadByJopId(owner.id, folderId);
		if (!folderItem) throw new ErrorNotFound(`No such folder: ${folderId}`);

		const share = await this.models().share().byUserAndItemId(owner.id, folderItem.id);
		if (share) return share;

		const shareToSave: Share = {
			type: ShareType.Folder,
			item_id: folderItem.id,
			owner_id: owner.id,
			folder_id: folderId,
			master_key_id: masterKeyId,
		};

		await this.checkIfAllowed(owner, AclAction.Create, shareToSave);
		return super.save(shareToSave);
	}

	public async shareNote(owner: User, noteId: string, masterKeyId: string, recursive: boolean): Promise<Share> {
		const noteItem = await this.models().item().loadByJopId(owner.id, noteId);
		if (!noteItem) throw new ErrorNotFound(`No such note: ${noteId}`);

		const existingShare = await this.byItemAndRecursive(noteItem.id, recursive);
		if (existingShare) return existingShare;

		const shareToSave: Share = {
			type: ShareType.Note,
			item_id: noteItem.id,
			owner_id: owner.id,
			note_id: noteId,
			master_key_id: masterKeyId,
			recursive: recursive ? 1 : 0,
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

	public async deleteByUserId(userId: Uuid) {
		const shares = await this.sharesByUser(userId);

		await this.withTransaction(async () => {
			for (const share of shares) {
				await this.delete(share.id);
			}
		}, 'ShareModel::deleteByUserId');
	}

	public async itemCountByShareId(shareId: Uuid): Promise<number> {
		const r = await this
			.db('items')
			.count('id', { as: 'item_count' })
			.where('jop_share_id', '=', shareId);
		return r[0].item_count;
	}

	public async itemCountByShareIdPerUser(shareId: Uuid): Promise<{ item_count: number; user_id: Uuid }[]> {
		return this.db('user_items')
			.select(this.db.raw('user_id, count(user_id) as item_count'))
			.whereIn('item_id',
				this.db('items')
					.select('id')
					.where('jop_share_id', '=', shareId)
			).groupBy('user_id') as any;
	}


}
