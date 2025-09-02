import { strict as assert } from 'assert';
import { ActionableClient, FolderData, FuzzContext, ItemId, NoteData, ShareOptions, TreeItem, assertIsFolder, isFolder } from './types';
import FolderRecord from './model/FolderRecord';

interface ClientData {
	childIds: ItemId[];
}

interface ClientInfo {
	email: string;
}

class ActionTracker {
	private idToItem_: Map<ItemId, TreeItem> = new Map();
	private tree_: Map<string, ClientData> = new Map();
	public constructor(private readonly context_: FuzzContext) {}

	private getToplevelParent_(item: ItemId|TreeItem) {
		let itemId = typeof item === 'string' ? item : item.id;
		const originalItemId = itemId;
		const seenIds = new Set<ItemId>();
		while (this.idToItem_.get(itemId)?.parentId) {
			seenIds.add(itemId);

			itemId = this.idToItem_.get(itemId).parentId;
			if (seenIds.has(itemId)) {
				throw new Error('Assertion failure: Item hierarchy is not a tree.');
			}
		}

		const toplevelItem = this.idToItem_.get(itemId);
		assert.ok(toplevelItem, `Parent not found for item, top:${itemId} (started at ${originalItemId})`);
		assert.equal(toplevelItem.parentId, '', 'Should be a toplevel item');

		return toplevelItem;
	}

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

				// Shared folders
				assert.ok(item.ownedByEmail, 'all folders should have a "shareOwner" property (even if not shared)');
				if (item.isRootSharedItem) {
					assert.equal(item.parentId, '', 'only toplevel folders should be shared');
				}
				for (const sharedWith of item.shareRecipients) {
					assert.ok(this.tree_.has(sharedWith), 'all sharee users should exist');
				}
				// isSharedWith is only valid for toplevel folders
				if (item.parentId === '') {
					assert.ok(!item.isSharedWith(item.ownedByEmail), 'the share owner should not be in an item\'s sharedWith list');
				}

				// Uniqueness
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

	public track(client: ClientInfo) {
		const clientId = client.email;
		// If the client's remote account already exists, continue using it:
		if (!this.tree_.has(clientId)) {
			this.tree_.set(clientId, {
				childIds: [],
			});
		}

		const getChildIds = (itemId: ItemId) => {
			const item = this.idToItem_.get(itemId);
			if (!item || !isFolder(item)) return [];
			return item.childIds;
		};
		const updateChildren = (parentId: ItemId, updateFn: (oldChildren: ItemId[])=> ItemId[]) => {
			const parent = this.idToItem_.get(parentId);
			if (!parent) throw new Error(`Parent with ID ${parentId} not found.`);
			if (!isFolder(parent)) throw new Error(`Item ${parentId} is not a folder`);

			this.idToItem_.set(parentId, parent.withChildren(updateFn(parent.childIds)));
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

			const item = this.idToItem_.get(itemId);
			const isOwnedByThis = isFolder(item) && item.ownedByEmail === clientId;

			if (isOwnedByThis) { // Unshare
				let removed = false;
				for (const id of this.tree_.keys()) {
					const result = removeForClient(id);
					removed ||= result;
				}

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

		const getAllFolders = () => {
			return mapItems((item): FolderRecord => {
				return isFolder(item) ? item : null;
			}).filter(item => !!item);
		};

		const isReadOnly = (item: ItemId|TreeItem) => {
			if (item === '') return false;

			const toplevelItem = this.getToplevelParent_(item);
			assertIsFolder(toplevelItem);
			return toplevelItem.isReadOnlySharedWith(clientId);
		};

		const isShared = (item: TreeItem) => {
			const toplevelItem = this.getToplevelParent_(item);
			assertIsFolder(toplevelItem);
			return toplevelItem.isRootSharedItem;
		};

		const assertWriteable = (item: ItemId|TreeItem) => {
			if (typeof item !== 'string') {
				item = item.id;
			}

			if (isReadOnly(item)) {
				throw new Error(`Item is read-only: ${item}`);
			}
		};

		const removeFromShare = (id: ItemId, shareWith: ClientInfo) => {
			const targetItem = this.idToItem_.get(id);
			assertIsFolder(targetItem);

			assert.ok(targetItem.isSharedWith(shareWith.email), `Folder ${id} should be shared with ${shareWith.email}`);

			const otherSubTree = this.tree_.get(shareWith.email);
			this.tree_.set(shareWith.email, {
				...otherSubTree,
				childIds: otherSubTree.childIds.filter(childId => childId !== id),
			});

			this.idToItem_.set(id, targetItem.withRemovedFromShare(shareWith.email));

			this.checkRep_();
		};

		const tracker: ActionableClient = {
			createNote: (data: NoteData) => {
				assertWriteable(data.parentId);

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
				assertWriteable(data.parentId);

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
			createFolder: (data: FolderData) => {
				const parentId = data.parentId ?? '';
				assertWriteable(parentId);

				this.idToItem_.set(data.id, new FolderRecord({
					...data,
					parentId: parentId ?? '',
					childIds: getChildIds(data.id),
					sharedWith: [],
					ownedByEmail: clientId,
					isShared: false,
				}));
				addChild(data.parentId, data.id);

				this.checkRep_();
				return Promise.resolve();
			},
			deleteFolder: (id: ItemId) => {
				this.checkRep_();

				const item = this.idToItem_.get(id);
				if (!item) throw new Error(`Not found ${id}`);
				assertIsFolder(item);
				assertWriteable(item);

				removeItemRecursive(id);

				this.checkRep_();
				return Promise.resolve();
			},
			deleteNote: (id: ItemId) => {
				this.checkRep_();

				const item = this.idToItem_.get(id);
				if (!item) throw new Error(`Not found ${id}`);
				assert.ok(!isFolder(item), 'should be a note');
				assertWriteable(item);

				removeItemRecursive(id);

				this.checkRep_();
				return Promise.resolve();
			},
			shareFolder: (id: ItemId, shareWith: ClientInfo, options: ShareOptions) => {
				const itemToShare = this.idToItem_.get(id);
				assertIsFolder(itemToShare);

				const alreadyShared = itemToShare.isSharedWith(shareWith.email);
				assert.ok(!alreadyShared, `Folder ${id} should not yet be shared with ${shareWith.email}`);

				const shareWithChildIds = this.tree_.get(shareWith.email).childIds;
				assert.ok(
					!shareWithChildIds.includes(id), `Share recipient (${shareWith.email}) should not have a folder with ID ${id} before receiving the share.`,
				);

				this.tree_.set(shareWith.email, {
					...this.tree_.get(shareWith.email),
					childIds: [...shareWithChildIds, id],
				});

				this.idToItem_.set(
					id, itemToShare.withShared(shareWith.email, options.readOnly),
				);

				this.checkRep_();
				return Promise.resolve();
			},
			removeFromShare: (id, client) => Promise.resolve(removeFromShare(id, client)),
			deleteAssociatedShare: (id: ItemId) => {
				const targetItem = this.idToItem_.get(id);
				assertIsFolder(targetItem);

				for (const recipient of targetItem.shareRecipients) {
					removeFromShare(id, { email: recipient });
				}

				this.idToItem_.set(id, targetItem.withUnshared());

				this.checkRep_();
				return Promise.resolve();
			},
			moveItem: (itemId, newParentId) => {
				const item = this.idToItem_.get(itemId);

				const validateParameters = () => {
					assert.ok(item, `item with ${itemId} should exist`);

					if (newParentId) {
						const parent = this.idToItem_.get(newParentId);
						assert.ok(parent, `parent with ID ${newParentId} should exist`);
					} else {
						assert.equal(newParentId, '', 'parentId should be empty if a toplevel folder');
					}

					if (isFolder(item)) {
						assert.equal(item.isRootSharedItem, false, 'cannot move toplevel shared folders without first unsharing');
					}

					assertWriteable(itemId);
					assertWriteable(newParentId);
				};
				validateParameters();

				removeChild(item.parentId, itemId);
				addChild(newParentId, itemId);
				this.idToItem_.set(
					itemId,
					isFolder(item) ? item.withParent(newParentId) : { ...item, parentId: newParentId },
				);

				this.checkRep_();
				return Promise.resolve();
			},
			sync: () => Promise.resolve(),
			listNotes: () => {
				const notes = mapItems(item => {
					return isFolder(item) ? null : item;
				}).filter(item => !!item).map(item => ({
					...item,
					isShared: isShared(item),
				}));

				this.checkRep_();
				return Promise.resolve(notes);
			},
			listFolders: () => {
				this.checkRep_();
				const folderData = getAllFolders().map(item => ({
					id: item.id,
					title: item.title,
					parentId: item.parentId,
					isShared: isShared(item),
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
				let folders = getAllFolders();
				if (options.filter) {
					folders = folders.filter(options.filter);
				}
				if (!options.includeReadOnly) {
					folders = folders.filter(folder => !isReadOnly(folder.id));
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
