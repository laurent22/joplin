import { strict as assert } from 'assert';
import { ActionableClient, FolderData, FolderMetadata, FuzzContext, ItemId, NoteData, TreeItem, isFolder } from './types';
import type Client from './Client';

interface ClientData {
	childIds: ItemId[];
	// Shared folders belonging to the client
	sharedFolderIds: ItemId[];
}

class ActionTracker {
	private idToItem_: Map<ItemId, TreeItem> = new Map();
	private tree_: Map<string, ClientData> = new Map();
	public constructor(private readonly context_: FuzzContext) {}

	private checkRep_() {
		const checkItem = (itemId: ItemId) => {
			assert.match(itemId, /^[a-zA-Z0-9]{32}$/, 'item IDs should be 32 character alphanumeric strings');

			const item = this.idToItem_.get(itemId);
			assert.ok(!!item, `should find item with ID ${itemId}`);

			if (item.parentId) {
				const parent = this.idToItem_.get(item.parentId);
				assert.ok(parent, `should find parent (id: ${item.parentId})`);

				assert.ok(isFolder(parent), 'parent should be a folder');
				assert.ok(parent.childIds.includes(itemId), 'parent should include the current item in its children');
			}

			if (isFolder(item)) {
				for (const childId of item.childIds) {
					checkItem(childId);
				}

				assert.equal(
					item.childIds.length,
					[...new Set(item.childIds)].length,
					'child IDs should be unique',
				);
			}
		};

		for (const clientData of this.tree_.values()) {
			for (const childId of clientData.childIds) {
				assert.ok(this.idToItem_.has(childId), `root item ${childId} should exist`);

				const item = this.idToItem_.get(childId);
				assert.ok(!!item);
				assert.equal(item.parentId, '', `${childId} should not have a parent`);

				checkItem(childId);
			}
		}
	}

	public track(client: { email: string }) {
		const clientId = client.email;
		this.tree_.set(clientId, {
			childIds: [],
			sharedFolderIds: [],
		});

		const getChildIds = (itemId: ItemId) => {
			const item = this.idToItem_.get(itemId);
			if (!item || !isFolder(item)) return [];
			return item.childIds;
		};
		const updateChildren = (parentId: ItemId, updateFn: (oldChildren: ItemId[])=> ItemId[]) => {
			const parent = this.idToItem_.get(parentId);
			if (!parent) throw new Error(`Parent with ID ${parentId} not found.`);
			if (!isFolder(parent)) throw new Error(`Item ${parentId} is not a folder`);

			this.idToItem_.set(parentId, {
				...parent,
				childIds: updateFn(parent.childIds),
			});
		};
		const addRootItem = (itemId: ItemId) => {
			const clientData = this.tree_.get(clientId);
			if (!clientData.childIds.includes(itemId)) {
				this.tree_.set(clientId, {
					...clientData,
					childIds: [...clientData.childIds, itemId],
				});
			}
		};

		// Returns true iff the given item ID is now unused.
		const removeRootItem = (itemId: ItemId) => {
			const removeForClient = (clientId: string) => {
				const clientData = this.tree_.get(clientId);
				const childIds = clientData.childIds;

				if (childIds.includes(itemId)) {
					const newChildIds = childIds.filter(otherId => otherId !== itemId);
					this.tree_.set(clientId, {
						...clientData,
						childIds: newChildIds,
					});
					return true;
				}

				return false;
			};

			const hasBeenCompletelyRemoved = () => {
				for (const clientData of this.tree_.values()) {
					if (clientData.childIds.includes(itemId)) {
						return false;
					}
				}
				return true;
			};

			const isOwnedByThis = this.tree_.get(clientId).sharedFolderIds.includes(itemId);

			if (isOwnedByThis) { // Unshare
				let removed = false;
				for (const id of this.tree_.keys()) {
					const result = removeForClient(id);
					removed ||= result;
				}

				const clientData = this.tree_.get(clientId);
				this.tree_.set(clientId, {
					...clientData,
					sharedFolderIds: clientData.sharedFolderIds.filter(id => id !== itemId),
				});

				// At this point, the item shouldn't be a child of any clients:
				assert.ok(hasBeenCompletelyRemoved(), 'item should be removed from all clients');
				assert.ok(removed, 'should be a toplevel item');

				// The item is unshared and can be removed entirely
				return true;
			} else {
				// Otherwise, even if part of a share, removing the
				// notebook just leaves the share.
				const removed = removeForClient(clientId);
				assert.ok(removed, 'should be a toplevel item');

				if (hasBeenCompletelyRemoved()) {
					return true;
				}
			}

			return false;
		};
		const addChild = (parentId: ItemId, childId: ItemId) => {
			if (parentId) {
				updateChildren(parentId, (oldChildren) => {
					if (oldChildren.includes(childId)) return oldChildren;
					return [...oldChildren, childId];
				});
			} else {
				addRootItem(childId);
			}
		};
		const removeChild = (parentId: ItemId, childId: ItemId) => {
			if (!parentId) {
				removeRootItem(childId);
			} else {
				updateChildren(parentId, (oldChildren) => {
					return oldChildren.filter(otherId => otherId !== childId);
				});
			}
		};
		const removeItemRecursive = (id: ItemId) => {
			const item = this.idToItem_.get(id);
			if (!item) throw new Error(`Item with ID ${id} not found.`);

			if (item.parentId) {
				// The parent may already be removed
				if (this.idToItem_.has(item.parentId)) {
					removeChild(item.parentId, item.id);
				}

				this.idToItem_.delete(id);
			} else {
				const idIsUnused = removeRootItem(item.id);
				if (idIsUnused) {
					this.idToItem_.delete(id);
				}
			}

			if (isFolder(item)) {
				for (const childId of item.childIds) {
					const child = this.idToItem_.get(childId);
					assert.equal(child?.parentId, id, `child ${childId} should have accurate parent ID`);

					removeItemRecursive(childId);
				}
			}
		};
		const mapItems = <T> (map: (item: TreeItem)=> T) => {
			const workList: ItemId[] = [...this.tree_.get(clientId).childIds];
			const result: T[] = [];

			while (workList.length > 0) {
				const id = workList.pop();
				const item = this.idToItem_.get(id);
				if (!item) throw new Error(`Not found: ${id}`);

				result.push(map(item));

				if (isFolder(item)) {
					for (const childId of item.childIds) {
						workList.push(childId);
					}
				}
			}

			return result;
		};

		const listFoldersDetailed = () => {
			return mapItems((item): FolderData => {
				return isFolder(item) ? item : null;
			}).filter(item => !!item);
		};

		const tracker: ActionableClient = {
			createNote: (data: NoteData) => {
				assert.ok(!!data.parentId, `note ${data.id} should have a parentId`);
				assert.ok(!this.idToItem_.has(data.id), `note ${data.id} should not yet exist`);
				this.idToItem_.set(data.id, {
					...data,
				});
				addChild(data.parentId, data.id);

				this.checkRep_();
				return Promise.resolve();
			},
			updateNote: (data: NoteData) => {
				const oldItem = this.idToItem_.get(data.id);
				assert.ok(oldItem, `note ${data.id} should exist`);
				assert.ok(!!data.parentId, `note ${data.id} should have a parentId`);

				removeChild(oldItem.parentId, data.id);
				this.idToItem_.set(data.id, {
					...data,
				});
				addChild(data.parentId, data.id);

				this.checkRep_();
				return Promise.resolve();
			},
			createFolder: (data: FolderMetadata) => {
				this.idToItem_.set(data.id, {
					...data,
					parentId: data.parentId ?? '',
					childIds: getChildIds(data.id),
					isShareRoot: false,
				});
				addChild(data.parentId, data.id);

				this.checkRep_();
				return Promise.resolve();
			},
			deleteFolder: (id: ItemId) => {
				this.checkRep_();

				const item = this.idToItem_.get(id);
				if (!item) throw new Error(`Not found ${id}`);
				if (!isFolder(item)) throw new Error(`Not a folder ${id}`);

				removeItemRecursive(id);

				this.checkRep_();
				return Promise.resolve();
			},
			shareFolder: (id: ItemId, shareWith: Client) => {
				const shareWithChildIds = this.tree_.get(shareWith.email).childIds;
				if (shareWithChildIds.includes(id)) {
					throw new Error(`Folder ${id} already shared with ${shareWith.email}`);
				}
				assert.ok(this.idToItem_.has(id), 'should exist');

				const sharerClient = this.tree_.get(clientId);
				if (!sharerClient.sharedFolderIds.includes(id)) {
					this.tree_.set(clientId, {
						...sharerClient,
						sharedFolderIds: [...sharerClient.sharedFolderIds, id],
					});
				}

				this.tree_.set(shareWith.email, {
					...this.tree_.get(shareWith.email),
					childIds: [...shareWithChildIds, id],
				});

				this.idToItem_.set(id, {
					...this.idToItem_.get(id),
					isShareRoot: true,
				});

				this.checkRep_();
				return Promise.resolve();
			},
			moveItem: (itemId, newParentId) => {
				const item = this.idToItem_.get(itemId);
				assert.ok(item, `item with ${itemId} should exist`);

				if (newParentId) {
					const parent = this.idToItem_.get(newParentId);
					assert.ok(parent, `parent with ID ${newParentId} should exist`);
				} else {
					assert.equal(newParentId, '', 'parentId should be empty if a toplevel folder');
				}

				if (isFolder(item)) {
					assert.equal(item.isShareRoot, false, 'cannot move toplevel shared folders without first unsharing');
				}

				removeChild(item.parentId, itemId);
				addChild(newParentId, itemId);
				this.idToItem_.set(itemId, {
					...item,
					parentId: newParentId,
				});

				this.checkRep_();
				return Promise.resolve();
			},
			sync: () => Promise.resolve(),
			listNotes: () => {
				const notes = mapItems(item => {
					return isFolder(item) ? null : item;
				}).filter(item => !!item);

				this.checkRep_();
				return Promise.resolve(notes);
			},
			listFolders: () => {
				this.checkRep_();
				const folderData = listFoldersDetailed().map(item => ({
					id: item.id,
					title: item.title,
					parentId: item.parentId,
				}));

				return Promise.resolve(folderData);
			},
			allFolderDescendants: (parentId) => {
				this.checkRep_();

				const descendants: ItemId[] = [];
				const addDescendants = (id: ItemId) => {
					const item = this.idToItem_.get(id);
					assert.ok(isFolder(item), 'should be a folder');

					for (const id of item.childIds) {
						descendants.push(id);

						const item = this.idToItem_.get(id);
						if (isFolder(item)) {
							addDescendants(item.id);
						}
					}
				};

				descendants.push(parentId);
				addDescendants(parentId);

				return Promise.resolve(descendants);
			},
			randomFolder: async (options) => {
				let folders = listFoldersDetailed();
				if (options.filter) {
					folders = folders.filter(options.filter);
				}

				const folderIndex = this.context_.randInt(0, folders.length);
				return folders.length ? folders[folderIndex] : null;
			},
			randomNote: async () => {
				const notes = await tracker.listNotes();
				const noteIndex = this.context_.randInt(0, notes.length);
				return notes.length ? notes[noteIndex] : null;
			},
		};
		return tracker;
	}
}

export default ActionTracker;
