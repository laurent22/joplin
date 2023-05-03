import { ChangeType, Item, ItemType, UserItem, Uuid } from '../services/database/types';
import BaseModel, { DeleteOptions, LoadOptions, SaveOptions } from './BaseModel';
import { unique } from '../utils/array';
import { ErrorNotFound } from '../utils/errors';
import { Knex } from 'knex';

interface DeleteByShare {
	id: Uuid;
	owner_id: Uuid;
}

export interface UserItemDeleteOptions extends DeleteOptions {
	byItemIds?: string[];
	byShareId?: string;
	byUserId?: string;
	byUserItem?: UserItem;
	byUserItemIds?: number[];
	byShare?: DeleteByShare;
	recordChanges?: boolean;
}

export default class UserItemModel extends BaseModel<UserItem> {

	public get tableName(): string {
		return 'user_items';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async remove(userId: Uuid, itemId: Uuid): Promise<void> {
		await this.deleteByUserItem(userId, itemId);
	}

	public async userIdsByItemIds(itemIds: Uuid[]): Promise<Record<Uuid, Uuid[]>> {
		const rows: UserItem[] = await this.db(this.tableName).select('item_id', 'user_id').whereIn('item_id', itemIds);
		const output: Record<Uuid, Uuid[]> = {};
		for (const row of rows) {
			if (!output[row.item_id]) output[row.item_id] = [];
			output[row.item_id].push(row.user_id);
		}
		return output;
	}

	public async byItemIds(itemIds: Uuid[]): Promise<UserItem[]> {
		return this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
	}

	public async byShareId(shareId: Uuid, options: LoadOptions = {}): Promise<UserItem[]> {
		return this
			.db(this.tableName)
			.leftJoin('items', 'user_items.item_id', 'items.id')
			.select(this.selectFields(options, this.defaultFields, 'user_items'))
			.where('items.jop_share_id', '=', shareId);
	}

	public async byShareAndUserId(shareId: Uuid, userId: Uuid, options: LoadOptions = {}): Promise<UserItem[]> {
		return this
			.db(this.tableName)
			.leftJoin('items', 'user_items.item_id', 'items.id')
			.select(this.selectFields(options, this.defaultFields, 'user_items'))
			.where('items.jop_share_id', '=', shareId)
			.where('user_items.user_id', '=', userId);
	}

	public async byUserId(userId: Uuid): Promise<UserItem[]> {
		return this.db(this.tableName).where('user_id', '=', userId);
	}

	public async byUserAndItemId(userId: Uuid, itemId: Uuid): Promise<UserItem> {
		return this.db(this.tableName).where('user_id', '=', userId).where('item_id', '=', itemId).first();
	}

	// Returns any user item that is part of a share
	public async itemsInShare(userId: Uuid, options: LoadOptions = {}): Promise<UserItem[]> {
		return this
			.db(this.tableName)
			.leftJoin('items', 'user_items.item_id', 'items.id')
			.select(this.selectFields(options, this.defaultFields, 'user_items'))
			.where('items.jop_share_id', '!=', '')
			.where('user_items.user_id', '=', userId);
	}

	public async deleteByUserItem(userId: Uuid, itemId: Uuid, options: UserItemDeleteOptions = null): Promise<void> {
		const userItem = await this.byUserAndItemId(userId, itemId);
		if (!userItem) throw new ErrorNotFound(`No such user_item: ${userId} / ${itemId}`);
		await this.deleteBy({ ...options, byUserItem: userItem });
	}

	public async deleteByItemIds(itemIds: Uuid[], options: UserItemDeleteOptions = null): Promise<void> {
		await this.deleteBy({ ...options, byItemIds: itemIds });
	}

	public async deleteByShareId(shareId: Uuid): Promise<void> {
		await this.deleteBy({ byShareId: shareId });
	}

	public async deleteByShare(share: DeleteByShare): Promise<void> {
		await this.deleteBy({ byShare: share });
	}

	public async deleteByUserId(userId: Uuid): Promise<void> {
		await this.deleteBy({ byUserId: userId });
	}

	public async deleteByUserItemIds(userItemIds: number[]): Promise<void> {
		await this.deleteBy({ byUserItemIds: userItemIds });
	}

	public async deleteByShareAndUserId(shareId: Uuid, userId: Uuid): Promise<void> {
		await this.deleteBy({ byShareId: shareId, byUserId: userId });
	}

	public async add(userId: Uuid, itemId: Uuid, options: SaveOptions = {}): Promise<void> {
		const item = await this.models().item().load(itemId, { fields: ['id', 'name'] });
		await this.addMulti(userId, [item], options);
	}

	public async addMulti(userId: Uuid, itemsQuery: Knex.QueryBuilder | Item[], options: SaveOptions = {}): Promise<void> {
		const items: Item[] = Array.isArray(itemsQuery) ? itemsQuery : await itemsQuery.whereNotIn('id', this.db('user_items').select('item_id').where('user_id', '=', userId));
		if (!items.length) return;

		await this.withTransaction(async () => {
			for (const item of items) {
				if (!('name' in item) || !('id' in item)) throw new Error('item.id and item.name must be set');

				await super.save({
					user_id: userId,
					item_id: item.id,
				}, options);

				if (this.models().item().shouldRecordChange(item.name)) {
					await this.models().change().save({
						item_type: ItemType.UserItem,
						item_id: item.id,
						item_name: item.name,
						type: ChangeType.Create,
						previous_item: '',
						user_id: userId,
					});
				}
			}
		}, 'UserItemModel::addMulti');
	}

	public async save(_userItem: UserItem, _options: SaveOptions = {}): Promise<UserItem> {
		throw new Error('Call add() or addMulti()');
	}

	public async delete(_id: string | string[], _options: DeleteOptions = {}): Promise<void> {
		throw new Error('Use one of the deleteBy methods');
	}

	private async deleteBy(options: UserItemDeleteOptions = {}): Promise<void> {
		options = {
			recordChanges: true,
			...options,
		};

		let userItems: UserItem[] = [];

		if (options.byShareId && options.byUserId) {
			userItems = await this.byShareAndUserId(options.byShareId, options.byUserId);
		} else if (options.byItemIds) {
			userItems = await this.byItemIds(options.byItemIds);
		} else if (options.byShareId) {
			userItems = await this.byShareId(options.byShareId);
		} else if (options.byShare) {
			userItems = await this.byShareId(options.byShare.id);
			userItems = userItems.filter(u => u.user_id !== options.byShare.owner_id);
		} else if (options.byUserId) {
			userItems = await this.byUserId(options.byUserId);
		} else if (options.byUserItem) {
			userItems = [options.byUserItem];
		} else if (options.byUserItemIds) {
			userItems = await this.loadByIds(options.byUserItemIds as any);
		} else {
			throw new Error('Invalid options');
		}

		const itemIds = unique(userItems.map(ui => ui.item_id));
		const items = await this.models().item().loadByIds(itemIds, { fields: ['id', 'name'] });

		await this.withTransaction(async () => {
			for (const userItem of userItems) {
				const item = items.find(i => i.id === userItem.item_id);

				if (options.recordChanges && this.models().item().shouldRecordChange(item.name)) {
					await this.models().change().save({
						item_type: ItemType.UserItem,
						item_id: userItem.item_id,
						item_name: item.name,
						type: ChangeType.Delete,
						previous_item: '',
						user_id: userItem.user_id,
					});
				}
			}

			await this.db(this.tableName).whereIn('id', userItems.map(ui => ui.id)).delete();
		}, 'ItemModel::delete');
	}

}
