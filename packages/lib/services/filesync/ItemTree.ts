import { dirname, join } from 'path/posix';
import { FolderItem } from './types';
import { normalize } from 'path';
import { ModelType } from '../../BaseModel';
import { friendlySafeFilename } from '../../path-utils';
import time from '../../time';

export interface AddEvent {
	path: string;
	item: FolderItem;
}

export interface MoveEvent {
	fromPath: string;
	toPath: string;
	movedItem: FolderItem;
}

export interface UpdateEvent {
	path: string;
	item: FolderItem;
}

export interface DeleteEvent {
	path: string;
	item: FolderItem;
}

export interface AddActionListener {
	onAdd(event: AddEvent): Promise<FolderItem|void>;
}

interface MoveActionListener {
	onMove(event: MoveEvent): Promise<void>;
}

interface UpdateActionListener {
	onUpdate(event: UpdateEvent): Promise<void>;
}

interface DeleteActionListener {
	onDelete(event: DeleteEvent): Promise<void>;
}

export type ActionListeners = AddActionListener&MoveActionListener&UpdateActionListener&DeleteActionListener;

export const noOpActionListeners: ActionListeners = {
	onAdd: async ()=>{},
	onMove: async ()=>{},
	onUpdate: async ()=>{},
	onDelete: async ()=>{},
};

export default class ItemTree {
	private pathToItem_: Map<string, FolderItem> = new Map();
	private idToPath_: Map<string, string> = new Map();

	public constructor(private baseItem: FolderItem) {
		this.resetData();
	}

	public resetData() {
		this.pathToItem_.clear();
		this.idToPath_.clear();

		this.pathToItem_.set('.', this.baseItem);
		this.idToPath_.set(this.baseItem.id, '.');
	}

	public hasPath(path: string) {
		return this.pathToItem_.has(normalize(path));
	}

	public hasId(id: string) {
		return this.idToPath_.has(id);
	}

	public pathFromId(id: string) {
		if (!this.idToPath_.has(id)) {
			throw new Error(`Entity with id ${id} not found.`);
		}
		return this.idToPath_.get(id);
	}

	public getAtPath(path: string) {
		path = normalize(path);

		if (!this.pathToItem_.has(path)) {
			throw new Error(`No item found at path ${path}`);
		}
		return this.pathToItem_.get(path);
	}

	public getAtId(id: string) {
		return this.getAtPath(this.pathFromId(id));
	}

	public idAtPath(path: string) {
		path = normalize(path);
		return this.getAtPath(path).id;
	}

	private getUniqueItemPathInParent(parentPath: string, item: FolderItem) {
		const isFolder = item.type_ === ModelType.Folder;
		const basename = friendlySafeFilename(item.title);

		let filename;
		let path;
		let counter = 0;
		do {
			filename = `${basename}${counter ? ` (${counter})` : ''}${isFolder ? '' : '.md'}`;
			path = join(parentPath, filename);
			counter++;
		} while (this.hasPath(path));

		return path;
	}

	public addItemTo(parentPath: string, item: FolderItem, listeners: AddActionListener): Promise<FolderItem> {
		parentPath = normalize(parentPath);
		if (!this.pathToItem_.has(parentPath)) {
			throw new Error(`Can't add item ${item.id}:${item.title} to parent with path ${parentPath} -- parent is not present.`);
		}

		const path = this.getUniqueItemPathInParent(parentPath, item);
		return this.addItemAt(path, item, listeners);
	}

	public async addItemAt(path: string, item: FolderItem, listeners: AddActionListener) {
		path = normalize(path);
		if (this.pathToItem_.has(path)) {
			throw new Error(`Can't set item ${item.id}:${item.title} at path ${path} -- that path is already present.`);
		}
		if (!item.type_) {
			throw new Error(`Can't add an item without a type_ (adding ${item.id} to path ${path}).`);
		}

		const parentId = this.idAtPath(dirname(path));
		item = { ...item, parent_id: parentId };

		const updatedItem = await listeners.onAdd({ path, item });
		if (updatedItem) {
			item = updatedItem;
		}
		if (!item.id) {
			throw new Error(`Can't add item without an ID (added to path ${path}).`);
		}
		if (item.parent_id !== parentId) {
			throw new Error(`Changed parent ID (${item.parent_id}->${parentId})`);
		}

		this.pathToItem_.set(path, item);
		this.idToPath_.set(item.id, path);

		return item;
	}

	public moveToParent(itemId: string, newParentId: string, listeners: MoveActionListener) {
		return this.move(this.pathFromId(itemId), this.pathFromId(newParentId), listeners);
	}

	public move(fromPath: string, toPath: string, listeners: MoveActionListener): Promise<void> {
		fromPath = normalize(fromPath);
		toPath = normalize(toPath);

		const item = this.getAtPath(fromPath);

		let toParentPath;
		if (!this.hasPath(toPath)) {
			toParentPath = dirname(toPath);
		} else if (this.getAtPath(toPath).type_ === ModelType.Folder) {
			toParentPath = toPath;
			toPath = this.getUniqueItemPathInParent(toParentPath, item);
		} else {
			throw new Error(`Cannot move item from ${fromPath} to ${toPath} -- cannot make item a child of a non-folder.`);
		}

		const toParentId = this.idAtPath(toParentPath);

		this.pathToItem_.delete(fromPath);
		this.pathToItem_.set(toPath, item);
		this.idToPath_.set(item.id, toPath);

		const canHaveChildren = item.type_ === ModelType.Folder;
		const promises: Promise<void>[] = [];
		if (canHaveChildren) {
			// Handle the case where an item starts with path but is not a child of it
			const prefix = fromPath.endsWith('/') ? fromPath : `${fromPath}/`;
			for (const [path] of this.items()) {
				if (path.startsWith(prefix) && path !== prefix) {
					const childToPath = join(toPath, path.substring(prefix.length));
					promises.push(this.move(path, childToPath, listeners));
				}
			}
		}

		promises.push(listeners.onMove({
			fromPath,
			toPath,
			movedItem: { ...item, parent_id: toParentId },
		}));
		// eslint-disable-next-line -- TODO: Fix & determine whether this is really necessary.
		return Promise.all(promises).then(() => {});
	}

	public deleteItemAtId(id: string, listeners: DeleteActionListener) {
		return this.deleteAtPath(this.pathFromId(id), listeners);
	}

	public deleteAtPath(path: string, listeners: DeleteActionListener): Promise<void> {
		path = normalize(path);
		if (!this.hasPath(path)) {
			throw new Error(`Cannot delete item at non-existent path ${path}`);
		}

		const item = this.getAtPath(path);

		const canHaveChildren = item.type_ === ModelType.Folder;
		const promises: Promise<void>[] = [];
		if (canHaveChildren) {
			// Handle the case where an item starts with path but is not a child of it
			// (e.g. this/is/a/test2 is not a child of this/is/a/test).
			const prefix = path.endsWith('/') ? path : `${path}/`;
			for (const [path] of this.items()) {
				if (path.startsWith(prefix) && path !== prefix) {
					promises.push(this.deleteAtPath(path, listeners));
				}
			}
		}

		this.idToPath_.delete(item.id);
		this.pathToItem_.delete(path);

		// Return using Promise.all to avoid race conditions (do as much processing before
		// becoming async as possible).
		promises.push(listeners.onDelete({ path, item }));
		// eslint-disable-next-line -- TODO: Fix & determine whether this is really necessary.
		return Promise.all(promises).then(() => {});
	}

	public updateAtPath(path: string, newItem: FolderItem, listeners: UpdateActionListener) {
		path = normalize(path);
		const existingItem = this.getAtPath(path);
		newItem = { ...existingItem, ...newItem };
		if (newItem.id !== existingItem.id) {
			throw new Error(`Cannot change an item's ID in an update call (${existingItem.id}->${newItem.id}). Use .move instead.`);
		}
		if (newItem.type_ !== existingItem.type_) {
			throw new Error(`Cannot change an item's type in an update call (${existingItem.type_}->${newItem.type_})`);
		}

		newItem.updated_time = time.unixMs();
		this.pathToItem_.set(path, newItem);

		return listeners.onUpdate({ path, item: newItem });
	}

	public async processItem(item: FolderItem, listeners: ActionListeners) {
		this.checkRep_();

		let result = item;
		if (this.hasId(item.id)) {
			const existingItem = this.getAtId(item.id);

			if (item.deleted_time) {
				await this.deleteItemAtId(item.id, listeners);
				this.checkRep_();
			} else {
				let canUpdate = true;

				if (existingItem.parent_id !== item.parent_id) {
					const newParentId = item.parent_id;
					if (this.hasId(newParentId)) {
						await this.moveToParent(item.id, newParentId, listeners);
						this.checkRep_();
					} else {
						// Moved to an external folder
						await this.deleteItemAtId(item.id, listeners);
						canUpdate = false;
						this.checkRep_();
					}
				}

				if (canUpdate) {
					await this.updateAtPath(this.pathFromId(item.id), item, listeners);
					this.checkRep_();
				}
			}
		} else {
			const parentPath = this.pathFromId(item.parent_id);
			result = await this.addItemTo(parentPath, item, listeners);

			this.checkRep_();
		}

		this.checkRep_();
		return result;
	}

	public items() {
		return this.pathToItem_.entries();
	}

	// For tests/debugging --verifies that pathToItem_ and idToPath_ are consistent.
	public checkRep_() {
		for (const [id, path] of this.idToPath_.entries()) {
			if (!this.pathToItem_.has(path)) {
				throw new Error(`Paths in idToPath_ must be in pathToItem_ (path: ${path}, id: ${id})`);
			}
			if (this.getAtPath(path).id !== id) throw new Error('ID Mismatch');
			if (normalize(path) !== path) throw new Error(`All paths should be normalized (path: ${path})`);
		}

		for (const [path, item] of this.pathToItem_.entries()) {
			if (!this.idToPath_.has(item.id)) {
				throw new Error(`Items in pathToItem_ must also be in idToPath_ (path ${path})`);
			}
			if (item.parent_id && !this.hasId(item.parent_id)) {
				throw new Error(`Missing item's parent (item: ${item.title}:${item.id}, parent_id: ${item.parent_id})`);
			}
		}
	}
}
