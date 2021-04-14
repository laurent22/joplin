import BaseModel, { SaveOptions, LoadOptions } from './BaseModel';
import { ItemType, databaseSchema, Uuid, Item } from '../db';
import { paginateDbQuery, PaginatedResults, Pagination } from './utils/pagination';
import { isJoplinItemName, serializeJoplinItem, unserializeJoplinItem } from '../apps/joplin/joplinUtils';
import { ModelType } from '@joplin/lib/BaseModel';
import { ErrorNotFound } from '../utils/errors';

const mimeUtils = require('@joplin/lib/mime-utils.js').mime;

// Converts "root:/myfile.txt:" to "myfile.txt"
const extractNameRegex = /^root:\/(.*):$/;

export interface PaginatedItems extends PaginatedResults {
	items: Item[];
}

export default class ItemModel extends BaseModel<Item> {

	protected get tableName(): string {
		return 'items';
	}

	protected get trackChanges(): boolean {
		return true;
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

	// Remove first and last colon from a path element
	public pathToName(path: string): string {
		if (path === 'root') return '';
		return path.replace(extractNameRegex, '$1');
	}

	public async loadByJopId(jopId: string, options:LoadOptions = {}):Promise<Item> {
		return this.db(this.tableName).select(this.selectFields(options)).where('owner_id', '=', this.userId).where('jop_id', '=', jopId).first();
	}

	public async loadByName(name: string, options:LoadOptions = {}): Promise<Item> {
		return this
			.db('user_items')
			.leftJoin('items', 'items.id', 'user_items.item_id')
			.select(this.selectFields(options, null, 'items'))
			.where('user_items.user_id', '=', this.userId)
			.where('name', '=', name)
			.first();
	}

	public async loadWithContent(id: Uuid, options:LoadOptions = {}): Promise<Item> {
		return this
			.db('user_items')
			.leftJoin('items', 'items.id', 'user_items.item_id')
			.select(this.selectFields(options, ['*'], 'items'))
			.where('user_items.user_id', '=', this.userId)
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

	public async folderChildrenItemIds(folderId:string):Promise<Uuid[]> {
		let output:Uuid[] = [];

		const rows:Item[] = await this
			.db(this.tableName)
			.where('jop_parent_id', '=', folderId)
			.where('owner_id', '=', this.userId)
			.select('id', 'jop_type');

		for (const row of rows) {
			output.push(row.id);

			if (row.jop_type === ModelType.Folder) {
				const childrenIds = await this.folderChildrenItemIds(row.id);
				output = output.concat(childrenIds);
			}
		}

		return output;
	}

	public async shareJoplinFolderAndContent(withUserId:Uuid, folderId:string) {
		const folderItem = await this.loadByJopId(folderId, { fields: ['id'] });
		if (!folderItem) throw new ErrorNotFound('No such folder: ' + folderId);

		const itemIds = [folderItem.id].concat(await this.folderChildrenItemIds(folderId));

		const alreadySharedItemIds:string[] = await this
			.db('user_items')
			.pluck('item_id')
			.whereIn('item_id', itemIds)
			.where('user_id', '=', withUserId);

		await this.withTransaction(async () => {
			for (const itemId of itemIds) {
				if (alreadySharedItemIds.includes(itemId)) continue;
				await this.models().userItem({ userId: withUserId }).add(withUserId, itemId);
			}
		});
	}

	public itemToJoplinItem(itemRow: Item): any {
		if (itemRow.jop_type <= 0) throw new Error(`Not a Joplin item: ${itemRow.id}`);
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

	public async saveFromRawContent(name: string, buffer: Buffer) {
		const existingItem = await this.loadByName(name);

		const isJoplinItem = isJoplinItemName(name);

		const item: Item = {
			name,
		};

		if (isJoplinItem) {
			const joplinItem = await unserializeJoplinItem(buffer.toString());

			item.jop_id = joplinItem.id;
			item.jop_parent_id = joplinItem.parent_id || '';
			item.jop_type = joplinItem.type_;
			item.jop_encryption_applied = joplinItem.encryption_applied;

			delete joplinItem.id;
			delete joplinItem.parent_id;
			delete joplinItem.type_;
			delete joplinItem.encryption_applied;

			item.content = Buffer.from(JSON.stringify(joplinItem));
		}

		if (existingItem) item.id = existingItem.id;

		return this.save(item);
	}

	public async children(pathQuery: string, pagination: Pagination): Promise<PaginatedItems> {
		const query = this
			.db('user_items')
			.leftJoin('items', 'user_items.item_id', 'items.id')
			.select('items.name', 'items.updated_time')
			.where('user_items.user_id', '=', this.userId);

		if (pathQuery) {
			// We support /* as a prefix only. Anywhere else would have
			// performance issue or requires a revert index.
			const sqlLike = pathQuery.replace(/\/\*$/g, '/%');
			void query.where('name', 'like', sqlLike);
		}

		return paginateDbQuery(query, pagination, 'items');
	}

	public async save(item: Item, options: SaveOptions = {}): Promise<Item> {
		item = { ... item };
		const isNew = await this.isNew(item, options);

		if (item.content) {
			item.content_size = item.content.byteLength;
		}

		if (isNew) {
			if (!item.mime_type) item.mime_type = mimeUtils.fromFilename(item.name) || '';

			item.owner_id = this.userId;
		}

		return this.withTransaction(async () => {
			item = await super.save(item, options);

			if (isNew) await this.models().userItem().add(this.userId, item.id);

			return item;
		});
	}

}
