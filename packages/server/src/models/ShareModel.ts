import { Change, ChangeType, isUniqueConstraintError, Item, Share, ShareType, Uuid } from '../db';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { setQueryParameters } from '../utils/urlUtils';
import BaseModel, { DeleteOptions, ValidateOptions } from './BaseModel';
import { SharedRootInfo } from './ItemModel';

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}

	protected async validate(share: Share, _options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Link, ShareType.App, ShareType.JoplinRootFolder].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);
		if (await this.itemIsShared(share.type, share.item_id)) throw new ErrorBadRequest('A shared item cannot be shared again');

		const item = await this.models().item().load(share.item_id);
		if (!item) throw new ErrorNotFound(`Could not find item: ${share.item_id}`);

		return share;
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

	public async sharesByFileId(fileId: string): Promise<Share[]> {
		return this.db(this.tableName).select(this.defaultFields).where('file_id', '=', fileId);
	}

	public async byItemIds(itemIds: Uuid[]): Promise<Share[]> {
		return this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
	}

	public async sharesByUser(userId: Uuid, type: ShareType = null): Promise<Share[]> {
		const query = this.db(this.tableName)
			.select(this.defaultFields)
			.where('owner_id', '=', userId);

		if (type) void query.andWhere('type', '=', type);

		return query;
	}

	public async updateSharedItems() {

		const handleAddedToSharedFolder = async (item: Item, shareInfo: SharedRootInfo) => {
			const shareUsers = await this.models().shareUser().byShareId(shareInfo.share.id);

			for (const shareUser of shareUsers) {
				try {
					await this.models().userItem().add(shareUser.user_id, item.id);
				} catch (error) {
					if (isUniqueConstraintError(error)) {
						// Ignore - it means this user already has this item
					} else {
						throw error;
					}
				}
			}
		};

		const handleRemovedFromSharedFolder = async (item: Item, shareInfo: SharedRootInfo) => {
			const shareUsers = await this.models().shareUser().byShareId(shareInfo.share.id);

			for (const shareUser of shareUsers) {
				await this.models().userItem().remove(shareUser.user_id, item.id);
			}
		};

		const handleCreatedItem = async (_change: Change, item: Item) => {
			if (!item.jop_parent_id) return;
			const shareInfo = await this.models().item().joplinItemSharedRootInfo(item.jop_parent_id);
			if (!shareInfo) return;
			await handleAddedToSharedFolder(item, shareInfo);
		};

		const handleUpdatedItem = async (change: Change, item: Item) => {
			const previousItem: Item = this.models().change().unserializePreviousItem(change.previous_item);

			const previousShareInfo = previousItem?.jop_parent_id ? await this.models().item().joplinItemSharedRootInfo(previousItem.jop_parent_id) : null;
			const currentShareInfo = item.jop_parent_id ? await this.models().item().joplinItemSharedRootInfo(item.jop_parent_id) : null;

			// Item was not in a shared folder and is still not in one
			if (!previousShareInfo && !currentShareInfo) return;

			// Item was in a shared folder and is still in the same shared folder
			if (previousShareInfo && currentShareInfo && previousShareInfo.item.jop_parent_id === currentShareInfo.item.jop_parent_id) return;

			// Item was not previously in a shared folder but has been moved to one
			if (!previousShareInfo && currentShareInfo) {
				await handleAddedToSharedFolder(item, currentShareInfo);
				return;
			}

			// Item was in a shared folder and is no longer in one
			if (previousShareInfo && !currentShareInfo) {
				await handleRemovedFromSharedFolder(item, previousShareInfo);
				return;
			}

			// Item was in a shared folder and has been moved to a different shared folder
			if (previousShareInfo && currentShareInfo && previousShareInfo.item.jop_parent_id !== currentShareInfo.item.jop_parent_id) {
				await handleRemovedFromSharedFolder(item, previousShareInfo);
				await handleAddedToSharedFolder(item, currentShareInfo);
				return;
			}

			// Sanity check - because normally all cases are covered above
			throw new Error('Unreachable');
		};

		while (true) {
			const latestProcessedChange = await this.models().keyValue().value<string>('ShareService::latestProcessedChange');

			const changes = await this.models().change().allFromId(latestProcessedChange || '');
			if (!changes.length) break;

			const items = await this.models().item().loadByIds(changes.map(c => c.item_id));

			await this.withTransaction(async () => {
				for (const change of changes) {
					if (change.type === ChangeType.Create) {
						await handleCreatedItem(change, items.find(i => i.id === change.item_id));
					}

					if (change.type === ChangeType.Update) {
						await handleUpdatedItem(change, items.find(i => i.id === change.item_id));
					}
				}

				await this.models().keyValue().setValue('ShareService::latestProcessedChange', changes[changes.length - 1].id);
			});
		}
	}

	public async delete(id: string | string[], options: DeleteOptions = {}): Promise<void> {
		const ids = typeof id === 'string' ? [id] : id;
		const shares = await this.loadByIds(ids);

		await this.withTransaction(async () => {
			for (const share of shares) {
				await this.models().shareUser().deleteByShare(share);
				await this.models().userItem().deleteByShareId(share.id);
				await super.delete(share.id, options);
			}
		}, 'ShareModel::delete');
	}

}
