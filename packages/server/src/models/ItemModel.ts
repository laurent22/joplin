import BaseModel, { SaveOptions, LoadOptions, DeleteOptions, ValidateOptions } from './BaseModel';
import { ItemType, databaseSchema, Uuid, Item, ShareType, Share, ChangeType } from '../db';
import { defaultPagination, paginateDbQuery, PaginatedResults, Pagination } from './utils/pagination';
import { isJoplinItemName, linkedResourceIds, serializeJoplinItem, unserializeJoplinItem } from '../apps/joplin/joplinUtils';
import { ModelType } from '@joplin/lib/BaseModel';
import { ErrorNotFound, ErrorUnprocessableEntity } from '../utils/errors';
import { Knex } from 'knex';
import { ChangePreviousItem } from './ChangeModel';

const mimeUtils = require('@joplin/lib/mime-utils.js').mime;

// Converts "root:/myfile.txt:" to "myfile.txt"
const extractNameRegex = /^root:\/(.*):$/;

export interface PaginatedItems extends PaginatedResults {
	items: Item[];
}

export interface SharedRootInfo {
	item: Item;
	share: Share;
}

export default class ItemModel extends BaseModel<Item> {

	protected get tableName(): string {
		return 'items';
	}

	protected get itemType(): ItemType {
		return ItemType.Item;
	}

	protected get hasParentId(): boolean {
		return false;
	}

	protected get defaultFields(): string[] {
		return Object.keys(databaseSchema[this.tableName]).filter(f => f !== 'content');
	}

	// public async checkIfAllowed(user: User, action: AclAction, resource: Item = null): Promise<void> {
	// 	if (action === AclAction.Create) {

	// 	}

	// 	if (action === AclAction.Read) {
	// 		if (user.is_admin) return;
	// 		if (user.id !== resource.id) throw new ErrorForbidden('cannot view other users');
	// 	}

	// 	if (action === AclAction.Update) {
	// 		if (!user.is_admin && resource.id !== user.id) throw new ErrorForbidden('non-admin user cannot modify another user');
	// 		if (!user.is_admin && 'is_admin' in resource) throw new ErrorForbidden('non-admin user cannot make themselves an admin');
	// 		if (user.is_admin && user.id === resource.id && 'is_admin' in resource && !resource.is_admin) throw new ErrorForbidden('admin user cannot make themselves a non-admin');
	// 	}

	// 	if (action === AclAction.Delete) {
	// 		if (!user.is_admin) throw new ErrorForbidden('only admins can delete users');
	// 	}

	// 	if (action === AclAction.List) {
	// 		if (!user.is_admin) throw new ErrorForbidden('non-admin cannot list users');
	// 	}
	// }

	public fromApiInput(item: Item): Item {
		const output: Item = {};

		if ('id' in item) item.id = output.id;
		if ('name' in item) item.name = output.name;
		if ('mime_type' in item) item.mime_type = output.mime_type;

		return output;
	}

	public toApiOutput(object: any): any {
		if (Array.isArray(object)) {
			return object.map(f => this.toApiOutput(f));
		} else {
			const output: Item = {};
			const propNames = ['id', 'name', 'updated_time', 'created_time'];
			for (const k of Object.keys(object)) {
				if (propNames.includes(k)) (output as any)[k] = object[k];
			}
			return output;
		}
	}

	public async userHasItem(userId:Uuid, itemId:Uuid):Promise<boolean> {
		const r = await this
			.db('user_items')
			.select('user_items.id')
			.where('user_items.user_id', '=', userId)
			.where('user_items.item_id', '=', itemId)
			.first();
		return !!r;
	}

	// Remove first and last colon from a path element
	public pathToName(path: string): string {
		if (path === 'root') return '';
		return path.replace(extractNameRegex, '$1');
	}

	public async loadByJopIds(userId: Uuid, jopIds:string[],  options: LoadOptions = {}): Promise<Item[]> {
		if (!jopIds.length) return [];

		return this
			.db('user_items')
			.leftJoin('items', 'items.id', 'user_items.item_id')
			.select(this.selectFields(options, null, 'items'))
			.where('user_items.user_id', '=', userId)
			.whereIn('jop_id', jopIds);
	}

	public async loadByJopId(userId: Uuid, jopId: string, options: LoadOptions = {}): Promise<Item> {
		const items = await this.loadByJopIds(userId, [jopId], options);
		return items.length ? items[0] : null;
		// return this
		// 	.db('user_items')
		// 	.leftJoin('items', 'items.id', 'user_items.item_id')
		// 	.select(this.selectFields(options, null, 'items'))
		// 	.where('user_items.user_id', '=', userId)
		// 	.where('jop_id', '=', jopId)
		// 	.first();
	}

	public async loadByName(userId: Uuid, name: string, options: LoadOptions = {}): Promise<Item> {
		return this
			.db('user_items')
			.leftJoin('items', 'items.id', 'user_items.item_id')
			.select(this.selectFields(options, null, 'items'))
			.where('user_items.user_id', '=', userId)
			.where('name', '=', name)
			.first();
	}

	public async loadWithContent(id: Uuid, options: LoadOptions = {}): Promise<Item> {
		return this
			.db('user_items')
			.leftJoin('items', 'items.id', 'user_items.item_id')
			.select(this.selectFields(options, ['*'], 'items'))
			.where('items.id', '=', id)
			.first();
	}

	public async loadAsSerializedJoplinItem(id: Uuid): Promise<string> {
		return serializeJoplinItem(await this.loadAsJoplinItem(id));
	}

	public async serializedContent(item: Item | Uuid): Promise<Buffer> {
		item = typeof item === 'string' ? await this.loadWithContent(item) : item;

		if (item.jop_type > 0) {
			return Buffer.from(await serializeJoplinItem(this.itemToJoplinItem(item)));
		} else {
			return item.content;
		}
	}

	private async folderChildrenItems(userId: Uuid, folderId: string): Promise<Item[]> {
		let output: Item[] = [];

		const rows: Item[] = await this
			.db('user_items')
			.leftJoin('items', 'items.id', 'user_items.item_id')
			.select('items.id', 'items.jop_id', 'items.jop_type', 'items.jop_resource_ids')
			.where('items.jop_parent_id', '=', folderId)
			.where('user_items.user_id', '=', userId);

		for (const row of rows) {
			output.push(row);

			if (row.jop_type === ModelType.Folder) {
				const children = await this.folderChildrenItems(userId, row.jop_id);
				output = output.concat(children);
			}
		}

		return output;
	}

	public async shareJoplinFolderAndContent(shareId: Uuid, fromUserId: Uuid, toUserId: Uuid, folderId: string) {
		const folderItem = await this.loadByJopId(fromUserId, folderId, { fields: ['id'] });
		if (!folderItem) throw new ErrorNotFound(`No such folder: ${folderId}`);

		const items = [folderItem].concat(await this.folderChildrenItems(fromUserId, folderId));

		const alreadySharedItemIds: string[] = await this
			.db('user_items')
			.pluck('item_id')
			.whereIn('item_id', items.map(i => i.id))
			.where('user_id', '=', toUserId);

		await this.withTransaction(async () => {
			for (const item of items) {
				if (alreadySharedItemIds.includes(item.id)) continue;
				await this.models().userItem().add(toUserId, item.id, shareId);

				// const resourceIds = item.jop_resource_ids ? JSON.parse(item.jop_resource_ids) : [];
				// // const resourceItems = await this.loadByJopId

				// for (const resourceId of resourceIds) {
				// 	await this.models().userItem().add(toUserId, item.id, shareId);
				// }
			}
		});
	}

	public itemToJoplinItem(itemRow: Item): any {
		if (itemRow.jop_type <= 0) throw new Error(`Not a Joplin item: ${itemRow.id}`);
		if (!itemRow.content) throw new Error('Item content is missing');
		const item = JSON.parse(itemRow.content.toString());

		item.id = itemRow.jop_id;
		item.parent_id = itemRow.jop_parent_id;
		item.type_ = itemRow.jop_type;
		item.encryption_applied = itemRow.jop_encryption_applied;

		return item;
	}

	public async loadAsJoplinItem(id: Uuid): Promise<any> {
		const raw = await this.loadWithContent(id);
		return this.itemToJoplinItem(raw);
	}

	public async saveFromRawContent(userId: Uuid, name: string, buffer: Buffer) {
		const existingItem = await this.loadByName(userId, name);

		const isJoplinItem = isJoplinItemName(name);

		const item: Item = {
			name,
		};

		if (isJoplinItem) {
			const joplinItem = await unserializeJoplinItem(buffer.toString());
			const resourceIds = joplinItem.type_ === ModelType.Note ? linkedResourceIds(joplinItem.body) : '';

			item.jop_id = joplinItem.id;
			item.jop_parent_id = joplinItem.parent_id || '';
			item.jop_type = joplinItem.type_;
			item.jop_encryption_applied = joplinItem.encryption_applied || 0;
			item.jop_resource_ids = JSON.stringify(resourceIds);

			delete joplinItem.id;
			delete joplinItem.parent_id;
			delete joplinItem.type_;
			delete joplinItem.encryption_applied;

			item.content = Buffer.from(JSON.stringify(joplinItem));
		} else {
			item.content = buffer;
		}

		if (existingItem) item.id = existingItem.id;

		return this.saveForUser(userId, item);
	}

	protected async validate(item: Item, options: ValidateOptions = {}): Promise<Item> {
		if (options.isNew) {
			if (!item.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		} else {
			if ('name' in item && !item.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		}

		return super.validate(item, options);
	}


	private childrenQuery(userId: Uuid, pathQuery: string = '', options: LoadOptions = {}): Knex.QueryBuilder {
		const query = this
			.db('user_items')
			.leftJoin('items', 'user_items.item_id', 'items.id')
			.select(this.selectFields(options, ['id', 'name', 'updated_time'], 'items'))
			.where('user_items.user_id', '=', userId);

		if (pathQuery) {
			// We support /* as a prefix only. Anywhere else would have
			// performance issue or requires a revert index.
			const sqlLike = pathQuery.replace(/\/\*$/g, '/%');
			void query.where('name', 'like', sqlLike);
		}

		return query;
	}

	public itemUrl(): string {
		return `${this.baseUrl}/items`;
	}

	public itemContentUrl(itemId: Uuid): string {
		return `${this.baseUrl}/items/${itemId}/content`;
	}

	public async children(userId: Uuid, pathQuery: string = '', pagination: Pagination = null, options: LoadOptions = {}): Promise<PaginatedItems> {
		pagination = pagination || defaultPagination();
		const query = this.childrenQuery(userId, pathQuery, options);
		return paginateDbQuery(query, pagination, 'items');
	}

	public async childrenCount(userId: Uuid, pathQuery: string = ''): Promise<number> {
		const query = this.childrenQuery(userId, pathQuery);
		return query.count();
	}

	private async joplinItemPath(jopId: string): Promise<Item[]> {
		// Use Recursive Common Table Expression to find path to given item
		// https://www.sqlite.org/lang_with.html#recursivecte

		// with recursive paths(id, jop_id, jop_parent_id) as (
		//     select id, jop_id, jop_parent_id from items where jop_id = '000000000000000000000000000000F1'
		//     union
		//     select items.id, items.jop_id, items.jop_parent_id
		//     from items join paths where items.jop_id = paths.jop_parent_id
		// )
		// select id, jop_id, jop_parent_id from paths;

		return this.db.withRecursive('paths', (qb: Knex.QueryBuilder) => {
			void qb.select('id', 'jop_id', 'jop_parent_id')
				.from('items')
				.where('jop_id', '=', jopId)

				.union((qb: Knex.QueryBuilder) => {
					void qb
						.select('items.id', 'items.jop_id', 'items.jop_parent_id')
						.from('items')
						.join('paths', 'items.jop_id', 'paths.jop_parent_id');
				});
		}).select('id', 'jop_id', 'jop_parent_id').from('paths');
	}

	// If the note or folder is within a shared folder, this function returns
	// that shared folder. It returns null otherwise.
	public async joplinItemSharedRootInfo(jopId: string): Promise<SharedRootInfo | null> {
		const path = await this.joplinItemPath(jopId);
		if (!path.length) throw new Error(`Cannot retrieve path for item: ${jopId}`);
		const rootFolderItem = path[path.length - 1];
		const share = await this.models().share().itemShare(ShareType.JoplinRootFolder, rootFolderItem.id);
		if (!share) return null;

		return {
			item: await this.load(rootFolderItem.id),
			share,
		};
	}

	// Returns the item IDs that are owned only by the given user. In other
	// words, the items that are not shared with anyone else. Such items
	// can be safely deleted when the user is deleted.
	public async exclusivelyOwnedItemIds(userId: Uuid): Promise<Uuid[]> {
		const query = this
			.db('items')
			.select(this.db.raw('items.id, count(user_items.item_id) as user_item_count'))
			.leftJoin('user_items', 'user_items.item_id', 'items.id')
			.whereIn('items.id', this.db('user_items').select('user_items.item_id').where('user_id', '=', userId))
			.groupBy('items.id');

		const rows: any[] = await query;
		return rows.filter(r => r.user_item_count === 1).map(r => r.id);
	}

	public async deleteExclusivelyOwnedItems(userId: Uuid) {
		const itemIds = await this.exclusivelyOwnedItemIds(userId);
		await this.delete(itemIds);
	}

	public async deleteAll(userId: Uuid): Promise<void> {
		while (true) {
			const page = await this.children(userId, '', { ...defaultPagination(), limit: 1000 });
			await this.delete(page.items.map(c => c.id));
			if (!page.has_more) break;
		}
	}

	public async delete(id: string | string[], options: DeleteOptions = {}): Promise<void> {
		const ids = typeof id === 'string' ? [id] : id;
		if (!ids.length) return;

		const shares = await this.models().share().byItemIds(ids);
		const deletedItemUserIds = await this.models().userItem().userIdsByItemIds(ids);
		const items = await this.db(this.tableName).select('id', 'name').whereIn('id', ids);

		await this.withTransaction(async () => {

			const changeModel = this.models().change();

			for (const item of items) {
				const userIds = deletedItemUserIds[item.id];
				for (const userId of userIds) {
					await changeModel.save({
						item_type: this.itemType,
						parent_id: '',
						item_id: item.id,
						item_name: item.name,
						type: ChangeType.Delete,
						previous_item: '',
						user_id: userId,
					});
				}
			}

			await this.models().share().delete(shares.map(s => s.id));
			await this.models().userItem().deleteByItemIds(ids);
			await super.delete(ids, options);
		}, 'ItemModel::delete');
	}

	public async saveForUser(userId: Uuid, item: Item, options: SaveOptions = {}): Promise<Item> {
		item = { ... item };
		const isNew = await this.isNew(item, options);

		if (item.content) {
			item.content_size = item.content.byteLength;
		}

		if (isNew && !userId) throw new Error('userId is required when saving a new item');

		let previousItem: ChangePreviousItem = null;

		if (isNew) {
			if (!item.mime_type) item.mime_type = mimeUtils.fromFilename(item.name) || '';
		} else {
			previousItem = (await this.load(item.id, { fields: ['name', 'jop_parent_id', 'jop_resource_ids'] })) as ChangePreviousItem;
		}

		return this.withTransaction(async () => {
			item = await super.save(item, options);

			if (isNew) await this.models().userItem().add(userId, item.id);

			const changeModel = this.models().change();

			await changeModel.save({
				item_type: this.itemType,
				parent_id: '',
				item_id: item.id,
				item_name: item.name || previousItem.name,
				type: isNew ? ChangeType.Create : ChangeType.Update,
				previous_item: previousItem ? changeModel.serializePreviousItem(previousItem) : '',
				user_id: '',
			});

			return item;
		});
	}

	public async save(item: Item, options: SaveOptions = {}): Promise<Item> {
		return this.saveForUser('', item, options);
	}

}
