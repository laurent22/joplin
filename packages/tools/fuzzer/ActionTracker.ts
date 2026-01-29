import { strict as assert } from 'assert';
import { ActionableClient, FolderData, FuzzContext, ItemId, NoteData, ShareOptions, TreeItem, assertIsFolder, isFolder, isNote, isResource } from './types';
import FolderRecord from './model/FolderRecord';
import { extractResourceUrls } from '@joplin/lib/urlUtils';
import ResourceRecord from './model/ResourceRecord';

interface ClientData {
	childIds: ItemId[];
}

interface ClientInfo {
	email: string;
}

interface ActionLogEntry {
	action: string;
	source: string;
}

class ActionTracker {
	private idToActionLog_: Map<ItemId, ActionLogEntry[]> = new Map();
	private idToItem_: Map<ItemId, TreeItem> = new Map();
	private tree_: Map<string, ClientData> = new Map();
	public constructor(private readonly context_: FuzzContext) {}

	public getActionLog(id: ItemId) {
		return [...(this.idToActionLog_.get(id) ?? [])];
	}

	public printActionLog(id: ItemId) {
		const logEntries = this.getActionLog(id);
		if (logEntries.length === 0) {
			process.stdout.write('N/A\n');
			return;
		}

		const log = logEntries
			.map(item => `in:${item.source}: ${item.action}`)
			.join('\n');
		process.stdout.write(`${log}\n`);
	}

	private logAction_(item: ItemId|TreeItem, action: string, source: string) {
		const itemId = typeof item === 'string' ? item : item.id;

		const log = this.idToActionLog_.get(itemId) ?? [];
		this.idToActionLog_.set(itemId, log);

		log.push({ action, source });
	}

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
		const checkParentId = (item: TreeItem) => {
			if (item.parentId) {
				const parent = this.idToItem_.get(item.parentId);
				assert.ok(parent, `should find parent (id: ${item.parentId})`);

				assert.ok(isFolder(parent), 'parent should be a folder');
				assert.ok(parent.childIds.includes(item.id), 'parent should include the current item in its children');
			}
		};
		const checkFolder = (folder: FolderRecord) => {
			for (const childId of folder.childIds) {
				checkItem(childId);
			}

			// Shared folders
			assert.ok(folder.ownedByEmail, 'all folders should have a "shareOwner" property (even if not shared)');
			if (folder.isRootSharedItem) {
				assert.equal(folder.parentId, '', 'only toplevel folders should be shared');
			}
			for (const sharedWith of folder.shareRecipients) {
				assert.ok(this.tree_.has(sharedWith), 'all sharee users should exist');
			}
			// isSharedWith is only valid for toplevel folders
			if (folder.parentId === '') {
				assert.ok(!folder.isSharedWith(folder.ownedByEmail), 'the share owner should not be in an item\'s sharedWith list');
			}

			// Uniqueness
			assert.equal(
				folder.childIds.length,
				[...new Set(folder.childIds)].length,
				'child IDs should be unique',
			);
		};
		const checkNote = (note: NoteData) => {
			assert.ok(!isFolder(note));
			assert.ok(!isResource(note));
		};
		const checkResource = (resource: ResourceRecord) => {
			assert.ok(!isFolder(resource));
			assert.ok(!isNote(resource));
			assert.ok(isResource(resource));

			// References list should be up-to-date
			for (const noteId of resource.referencedBy) {
				const note = this.idToItem_.get(noteId);
				assert.ok(note, `all references should exist (testing ID ${noteId})`);
				assert.ok(isNote(note), 'all references should be notes');
				assert.ok(note.body.includes(resource.id), 'all references should include the resource ID');
			}
		};
		const checkItem = (itemId: ItemId) => {
			assert.match(itemId, /^[a-zA-Z0-9]{32}$/, 'item IDs should be 32 character alphanumeric strings');

			const item = this.idToItem_.get(itemId);
			assert.ok(!!item, `should find item with ID ${itemId}`);

			checkParentId(item);

			if (isFolder(item)) {
				checkFolder(item);
			} else if (isNote(item)) {
				checkNote(item);
			} else {
				checkResource(item);
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

		const logAction = (item: ItemId|TreeItem, action: string) => {
			this.logAction_(item, action, clientId);
		};
		const updateItem = (id: ItemId, newValue: TreeItem, changeLabel: string) => {
			logAction(id, changeLabel);
			this.idToItem_.set(id, newValue);
		};

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
				logAction(id, 'removed');
			} else {
				const idIsUnused = removeRootItem(item.id);
				if (idIsUnused) {
					this.idToItem_.delete(id);
					logAction(id, 'removed');
				}
			}

			if (isFolder(item)) {
				for (const childId of item.childIds) {
					const child = this.idToItem_.get(childId);
					assert.equal(child?.parentId, id, `child ${childId} should have accurate parent ID`);

					removeItemRecursive(childId);
				}
			} else if (isNote(item)) {
				updateResourceReferences(item, { ...item, body: '' });
			}
		};
		const mapItems = <T> (map: (item: TreeItem)=> T, startFolder?: FolderRecord) => {
			const startIds: readonly ItemId[] = (startFolder ?? this.tree_.get(clientId)).childIds;
			const workList = [...startIds];
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
				if (isNote(item)) {
					// Map linked resources
					const linkedIds = extractResourceUrls(item.body);
					for (const id of linkedIds) {
						const item = this.idToItem_.get(id.itemId);
						if (!item || !isResource(item)) continue;

						result.push(map(item));
					}
				}
			}

			return result;
		};

		const descendants = (folder: FolderRecord) => mapItems(item => item, folder);

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

			const updateLabel = `remove ${shareWith.email} from share`;
			updateItem(
				id, targetItem.withRemovedFromShare(shareWith.email), updateLabel,
			);
			for (const item of descendants(targetItem)) {
				logAction(item, updateLabel);
			}

			this.checkRep_();
		};

		const updateResourceReferences = (noteBefore: NoteData|null, noteAfter: NoteData|null) => {
			assert.ok(!!noteBefore || !!noteAfter, 'at least one of (noteBefore, noteAfter) must be specified');
			if (noteBefore && noteAfter) {
				assert.equal(noteBefore.id, noteAfter.id, 'changing note IDs is not supported');
			}

			const bodyBefore = noteBefore?.body ?? '';
			const bodyAfter = noteAfter?.body ?? '';
			if (bodyBefore === bodyAfter) return;

			const id = noteBefore?.id ?? noteAfter?.id;

			const referencesBefore = extractResourceUrls(bodyBefore).map(r => r.itemId);
			const referencesAfter = extractResourceUrls(bodyAfter).map(r => r.itemId);

			const newReferences = new Set(referencesAfter);
			for (const reference of referencesBefore) {
				newReferences.delete(reference);
			}

			const removedReferences = new Set(referencesBefore);
			for (const reference of referencesAfter) {
				removedReferences.delete(reference);
			}

			for (const reference of newReferences) {
				const item = this.idToItem_.get(reference);
				if (item && isResource(item)) {
					updateItem(item.id, item.withReference(id), `referenced by ${id}`);
				}
			}

			for (const reference of removedReferences) {
				const item = this.idToItem_.get(reference);
				if (item && isResource(item)) {
					updateItem(
						item.id,
						item.withoutReference(id),
						`dereferenced by ${id}`,
					);
				}
			}
		};

		const tracker: ActionableClient = {
			createNote: (data: NoteData) => {
				assertWriteable(data.parentId);

				assert.ok(!!data.parentId, `note ${data.id} should have a parentId`);
				assert.ok(!this.idToItem_.has(data.id), `note ${data.id} should not yet exist`);
				updateItem(data.id, {
					...data,
				}, `created in ${data.parentId}`);
				addChild(data.parentId, data.id);
				updateResourceReferences(null, data);

				this.checkRep_();
				return Promise.resolve();
			},
			updateNote: (data: NoteData) => {
				assertWriteable(data.parentId);

				const oldItem = this.idToItem_.get(data.id) as NoteData;
				assert.ok(oldItem, `note ${data.id} should exist`);
				assert.ok(!!data.parentId, `note ${data.id} should have a parentId`);

				// Additional debugging information about what changed:
				const changedFields = Object.entries(data)
					.filter(([key, newValue]) => {
						const itemKey = key as keyof NoteData;
						// isShared is a virtual property
						return key !== 'isShared'
							&& oldItem[itemKey] !== newValue;
					})
					.map(([key]) => {
						return key;
					});

				removeChild(oldItem.parentId, data.id);
				updateItem(data.id, {
					...data,
				}, `updated (changed fields: ${JSON.stringify(changedFields)})`);
				addChild(data.parentId, data.id);
				updateResourceReferences(oldItem, data);

				this.checkRep_();
				return Promise.resolve();
			},
			attachResource: async (note, resource) => {
				const resourceMarkup = `[resource](:/${resource.id})`;
				const withAttached = { ...note, body: `${note.body}${resourceMarkup}` };

				if (!tracker.itemExists(resource.id)) {
					await tracker.createResource(resource);
				}
				await tracker.updateNote(withAttached);
				return withAttached;
			},
			createResource: async (resource) => {
				if (tracker.itemExists(resource.id)) {
					// Don't double-create the item.
					return Promise.resolve();
				}

				updateItem(
					resource.id, new ResourceRecord({
						...resource,
						referencedBy: [],
					}),
					'created',
				);
				this.checkRep_();
				return Promise.resolve();
			},
			createFolder: (data: FolderData) => {
				const parentId = data.parentId ?? '';
				assertWriteable(parentId);

				updateItem(data.id, new FolderRecord({
					...data,
					parentId: parentId ?? '',
					childIds: getChildIds(data.id),
					sharedWith: [],
					ownedByEmail: clientId,
					isShared: false,
				}), `created ${data.parentId ? `in ${data.parentId}` : '(toplevel)'}`);
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
				assert.ok(isNote(item), 'should be a note');
				assertWriteable(item);

				removeItemRecursive(id);

				this.checkRep_();
				return Promise.resolve();
			},
			shareFolder: (id: ItemId, shareWith: ClientInfo, options: ShareOptions) => {
				assert.notEqual(client.email, shareWith.email, 'Cannot share a folder with the same client');

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

				updateItem(
					id,
					itemToShare.withShared(shareWith.email, options.readOnly),
					`shared with ${shareWith.email}`,
				);

				// Additional logging
				for (const item of descendants(itemToShare)) {
					logAction(item, `ancestor shared with ${shareWith.email}`);
				}

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

				updateItem(id, targetItem.withUnshared(), 'unshared');

				for (const item of descendants(targetItem)) {
					logAction(item, 'parent share removed');
				}

				this.checkRep_();
				return Promise.resolve();
			},
			moveItem: (itemId, newParentId) => {
				const item = this.idToItem_.get(itemId);
				assert.ok(isFolder(item) || isNote(item), `item with ${itemId} should be a folder or a note`);

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
				updateItem(
					itemId,
					isFolder(item) ? item.withParent(newParentId) : { ...item, parentId: newParentId },
					`moved to id:${newParentId}`,
				);

				this.checkRep_();
				return Promise.resolve();
			},
			publishNote: (id) => {
				const oldItem = this.idToItem_.get(id);
				assert.ok(oldItem, 'should exist');
				assert.ok(isNote(oldItem), 'only notes can be published');
				assert.ok(!oldItem.published, 'should not be published');

				updateItem(id, {
					...oldItem,
					published: true,
				}, 'published');

				this.checkRep_();
				return Promise.resolve();
			},
			unpublishNote: (id) => {
				const oldItem = this.idToItem_.get(id);
				assert.ok(oldItem, 'should exist');
				assert.ok(isNote(oldItem), 'only notes can be unpublished');
				assert.ok(oldItem.published, 'should be published');

				updateItem(id, {
					...oldItem,
					published: false,
				}, 'unpublished');

				this.checkRep_();
				return Promise.resolve();
			},
			sync: () => Promise.resolve(),
			listResources: () => {
				const items = mapItems(item => {
					return !isResource(item) ? null : item;
				}).filter(item => !!item && item.referenceCount > 0);
				return Promise.resolve(items);
			},
			listNotes: () => {
				const notes = mapItems(item => {
					return !isNote(item) ? null : item;
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

				return folders.length ? this.context_.randomFrom(folders) : null;
			},
			randomNote: async (options) => {
				let notes = await tracker.listNotes();
				if (!options.includeReadOnly) {
					notes = notes.filter(note => !isReadOnly(note.id));
				}
				const noteIndex = this.context_.randInt(0, notes.length);
				return notes.length ? notes[noteIndex] : null;
			},
			// Note: Does not verify that the current client has access to the item
			itemById: (id: ItemId) => {
				const item = this.idToItem_.get(id);

				if (!item) throw new Error(`No item found with ID ${id}`);
				return item;
			},
			itemExists: (id: ItemId) => {
				const item = this.idToItem_.get(id);
				if (!item) return false;
				if (isResource(item)) return true;

				const root = this.getToplevelParent_(id);
				if (isFolder(root)) {
					return root.ownedByEmail === client.email || root.isSharedWith(client.email);
				}

				return this.tree_.get(clientId).childIds.includes(id);
			},
		};
		return tracker;
	}
}

export default ActionTracker;
