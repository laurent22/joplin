import Client from './Client';
import ClientPool from './ClientPool';
import { assertIsFolder, assertIsNote, FuzzContext, ItemId, RandomFolderOptions, ResourceData } from './types';
import { strict as assert } from 'assert';
import Logger from '@joplin/utils/Logger';
import retryWithCount from './utils/retryWithCount';
import { Second } from '@joplin/utils/time';

const logger = Logger.create('ActionRunner');

export interface ActionSpec {
	key: string;
	options: Record<string, string|number>;
}

export default class ActionRunner {
	public constructor(private context_: FuzzContext, private clientPool_: ClientPool, private activeClient_: Client) {}

	public switchClient(client: Client) {
		this.activeClient_ = client;
	}

	public async syncAndCheckState() {
		await this.activeClient_.sync();

		// .checkState can fail occasionally due to incomplete
		// syncs (perhaps because the server is still processing
		// share-related changes?). Allow this to be retried:
		await retryWithCount(async () => {
			await this.clientPool_.checkState();
		}, {
			count: 4,
			delayOnFailure: count => count * Second * 3,
			onFail: async ({ willRetry }) => {
				if (willRetry) {
					logger.info('.checkState failed. Syncing all clients...');
					await this.clientPool_.syncAll();
				}
			},
		});
	}

	private buildActions_() {
		const { actions, schema, addAction } = getActions(this.context_, this.clientPool_, this.activeClient_);

		addAction('switchClient', async ({ id }) => {
			if (typeof id !== 'number') throw new Error(`clientId must be a number. Was ${id}`);
			this.switchClient(this.clientPool_.clientById(id));
			return true;
		}, { id: () => this.clientPool_.getClientId(this.clientPool_.randomClient()) });

		addAction('syncAndCheckState', async () => {
			await this.syncAndCheckState();
			return true;
		}, {});

		return { actions, schema };
	}

	private validateActions_(specs: ActionSpec[]) {
		const { schema } = this.buildActions_();
		const errors = [];
		for (const spec of specs) {
			const currentActionLabel = JSON.stringify([spec.key, spec.options]);

			const supportedOptions = schema.get(spec.key);
			if (!supportedOptions) {
				errors.push(
					`In ${currentActionLabel}: Unknown action: ${spec.key}. Available action keys: ${JSON.stringify([...schema.keys()])}`,
				);
				continue;
			}

			const providedOptions = Object.keys(spec.options);
			for (const option of providedOptions) {
				if (!supportedOptions.includes(option)) {
					errors.push(`In ${currentActionLabel}: Unknown option: ${option}. Supported options: ${JSON.stringify(supportedOptions)}`);
				}
			}
		}

		if (errors.length) {
			throw new Error(`Validation failed:\n- ${errors.join('\n- ')}`);
		}
	}

	public async doActions(specs: ActionSpec[]) {
		this.validateActions_(specs);

		for (const spec of specs) {
			const { actions } = this.buildActions_();

			const action = actions.get(spec.key);
			if (!action) throw new Error(`Not found: ${spec.key}`);

			await action(spec.options);
		}
	}

	public async doRandomAction() {
		// Avoid running special actions (e.g. "comment")
		const { actions } = this.buildActions_();

		const actionKeys = [...actions.keys()].filter(key => {
			// Avoid choosing certain actions:
			return key !== 'syncAndCheckState' && key !== 'switchClient' && key !== 'comment';
		});

		let result = false;
		while (!result) { // Loop until an action was done
			const randomAction = this.context_.randomFrom(actionKeys);
			logger.info(`Action: ${randomAction} in ${this.activeClient_.email}`);
			result = await actions.get(randomAction)({ });
			if (!result) {
				logger.info(`  ${randomAction} was skipped (preconditions not met).`);
			}
		}
	}
}

type ActionDefaults = { [key: string]: ()=> unknown|Promise<unknown> };
type ActionOptions<Defaults extends ActionDefaults> = {
	[t in keyof Defaults]: Awaited<ReturnType<Defaults[t]>>
};
type UnknownActionOptions = Record<string, unknown>;
type ActionFunction<Options extends UnknownActionOptions>
	= (options: Options)=> Promise<boolean>;

// Creates an action function, with defaults applied and logging
const createActionFunction = <Defaults extends ActionDefaults> (
	key: string, action: ActionFunction<ActionOptions<Defaults>>, defaults: Defaults,
): ActionFunction<Partial<ActionOptions<Defaults>>> => {
	return async (options) => {
		const builtOptions: Record<string, unknown> = {};
		for (const key in defaults) {
			const defaultValue = await defaults[key]();
			builtOptions[key] = options[key] ?? defaultValue;
		}

		logger.info('Run action:', JSON.stringify([key, builtOptions]));
		return action(builtOptions as ActionOptions<Defaults>);
	};
};

const getActions = (context: FuzzContext, clientPool: ClientPool, client: Client) => {
	const selectOrCreateWriteableFolder = async () => {
		let parentId = (await client.randomFolder({ includeReadOnly: false }))?.id;

		// Create a toplevel folder to serve as this
		// folder's parent if none exist yet
		if (!parentId) {
			parentId = context.randomId();
			await client.createFolder({
				parentId: '',
				id: parentId,
				title: 'Parent folder',
			});
		}

		return parentId;
	};

	const defaultNoteProperties = {
		published: false,
	};

	const selectOrCreateWriteableNote = async () => {
		const options = { includeReadOnly: false };
		let note = await client.randomNote(options);

		if (!note) {
			await client.createNote({
				...defaultNoteProperties,
				parentId: await selectOrCreateWriteableFolder(),
				id: context.randomId(),
				title: 'Test note',
				body: 'Body',
			});

			note = await client.randomNote(options);
			assert.ok(note, 'should have selected a random note');
		}

		return note.id;
	};

	const noteById = (id: ItemId) => {
		assert.ok(client.itemExists(id), `Could not find note with ID ${id} in client ${client.email}'s expected state.`);

		const note = client.itemById(id);
		assertIsNote(note);
		return note;
	};

	const folderById = (id: ItemId) => {
		assert.ok(client.itemExists(id), `Could not find folder with ID ${id} in client ${client.email}'s expected state.`);

		const folder = client.itemById(id);
		assertIsFolder(folder);
		return folder;
	};

	const folderByIdOrRandom = (id: ItemId|undefined, randomOptions: RandomFolderOptions) => {
		if (id !== undefined) {
			return folderById(id);
		} else {
			return client.randomFolder(randomOptions);
		}
	};

	const schema = new Map<string, string[]>; // Maps from keys to supported options
	const actions = new Map<string, ActionFunction<UnknownActionOptions>>();
	const addAction = <T extends ActionDefaults> (key: string, action: ActionFunction<ActionOptions<T>>, defaults: T) => {
		actions.set(key, createActionFunction(key, action, defaults) as ActionFunction<UnknownActionOptions>);
		schema.set(key, Object.keys(defaults));
	};

	const undefinedId = (): ItemId|undefined => undefined;

	addAction('newSubfolder', async ({ parentId, id }) => {
		await client.createRandomFolder({ parentId, id, quiet: false });
		return true;
	}, {
		parentId: selectOrCreateWriteableFolder,
		id: undefinedId,
	});

	addAction('newToplevelFolder', async ({ id }) => {
		await client.createRandomFolder({ parentId: '', id, quiet: false });
		return true;
	}, { id: undefinedId });

	addAction('newNote', async ({ parentId, id }) => {
		await client.createRandomNote({ parentId, id });
		return true;
	}, {
		parentId: selectOrCreateWriteableFolder,
		id: undefinedId,
	});

	addAction('renameNote', async ({ id }) => {
		await client.updateNote({
			...noteById(id),
			title: `Renamed (${context.randInt(0, 1000)})`,
		});

		return true;
	}, { id: selectOrCreateWriteableNote });

	addAction('updateNoteBody', async ({ id }) => {
		const note = noteById(id);

		await client.updateNote({
			...note,
			body: `${note.body}\n\nUpdated!`,
		});

		return true;
	}, { id: selectOrCreateWriteableNote });

	addAction('attachResourceTo', async ({ noteId, resourceId }) => {
		const resourceData: ResourceData = {
			id: resourceId,
			mimeType: 'text/plain',
			title: 'Test!',
		};
		await client.attachResource(noteById(noteId), resourceData);

		return true;
	}, {
		noteId: selectOrCreateWriteableNote,
		resourceId: () => context.randomId(),
	});

	addAction('moveNote', async ({ noteId, targetFolderId }) => {
		const note = noteById(noteId);
		const newParent = await folderByIdOrRandom(targetFolderId, {
			filter: folder => folder.id !== note.parentId,
			includeReadOnly: false,
		});
		if (!newParent) return false;

		await client.moveItem(note.id, newParent.id);
		return true;
	}, {
		noteId: selectOrCreateWriteableNote,
		targetFolderId: undefinedId,
	});

	addAction('duplicateNote', async ({ id, newNoteId }) => {
		const note = noteById(id);

		await client.createNote({
			...note,
			id: newNoteId,
		});
		return true;
	}, {
		id: selectOrCreateWriteableNote,
		newNoteId: () => context.randomId(),
	});

	addAction('deleteNote', async ({ id }) => {
		const validatedNote = noteById(id); // Ensure, e.g., that the note exists

		await client.deleteNote(validatedNote.id);
		return true;
	}, { id: selectOrCreateWriteableNote });

	const randomClientOnDifferentAccount = () => {
		const other = clientPool.randomClient(c => !c.hasSameAccount(client));
		if (!other) return undefined;
		return clientPool.getClientId(other);
	};

	addAction('shareFolder', async ({ otherClientId, folderId, readOnly }) => {
		// No suitable client?
		if (otherClientId === undefined) return false;

		const other = clientPool.clientById(otherClientId);
		const target = await folderByIdOrRandom(folderId, {
			filter: candidate => {
				const isToplevel = !candidate.parentId;
				const ownedByCurrent = candidate.ownedByEmail === client.email;
				const alreadyShared = isToplevel && candidate.isSharedWith(other.email);
				return isToplevel && ownedByCurrent && !alreadyShared;
			},
			includeReadOnly: true,
		});
		if (!target) return false;

		await client.shareFolder(target.id, other, { readOnly });
		return true;
	}, {
		otherClientId: randomClientOnDifferentAccount,
		folderId: undefinedId,
		readOnly: () => context.randInt(0, 2) === 1 && context.isJoplinCloud,
	});

	addAction('unshareFolder', async ({ folderId, clientId }) => {
		const target = await folderByIdOrRandom(folderId, {
			filter: candidate => {
				return candidate.isRootSharedItem && candidate.ownedByEmail === client.email;
			},
			includeReadOnly: true,
		});
		if (!target) return false;

		const recipientEmail = () => {
			if (clientId !== undefined) {
				if (clientId === 'all') {
					return 'all';
				}

				const email = clientPool.clientById(clientId).email;
				assert.ok(target.shareRecipients.includes(email), `Not shared with ${email}.`);
				return email;
			}

			const recipientIndex = context.randInt(-1, target.shareRecipients.length);
			if (recipientIndex === -1) return 'all';

			const recipientEmail = target.shareRecipients[recipientIndex];
			return recipientEmail;
		};


		const email = recipientEmail();
		if (email === 'all') { // Completely remove the share
			await client.deleteAssociatedShare(target.id);
		} else {
			const recipient = clientPool.clientsByEmail(email)[0];
			assert.ok(recipient, `invalid state -- recipient ${recipientEmail} should exist`);
			await client.removeFromShare(target.id, recipient);
		}
		return true;
	}, {
		folderId: undefinedId,
		clientId: (): number|'all'|undefined => undefined,
	});

	addAction('deleteFolder', async ({ folderId }) => {
		await client.deleteFolder(folderId);
		return true;
	}, {
		folderId: selectOrCreateWriteableFolder,
	});

	addAction('moveFolderToToplevel', async ({ folderId }) => {
		if (!folderId) return false;

		await client.deleteFolder(folderId);
		return true;
	}, {
		folderId: async () => (await client.randomFolder({
			// Don't choose items that are already toplevel
			filter: item => !!item.parentId,
			includeReadOnly: false,
		}))?.id,
	});

	addAction('moveFolderTo', async ({ sourceFolderId, newParentId }) => {
		const target = await folderByIdOrRandom(sourceFolderId, {
			// Don't move shared folders (should not be allowed by the GUI in the main apps).
			filter: item => !item.isRootSharedItem,
			includeReadOnly: false,
		});
		if (!target) return false;

		const targetDescendants = new Set(await client.allFolderDescendants(target.id));

		const newParent = await folderByIdOrRandom(newParentId, {
			filter: (item) => {
				// Avoid making the folder a child of itself
				return !targetDescendants.has(item.id);
			},
			includeReadOnly: false,
		});
		if (!newParent) return false;

		await client.moveItem(target.id, newParent.id);
		return true;
	}, {
		sourceFolderId: undefinedId,
		newParentId: undefinedId,
	});

	addAction('newClientOnSameAccount', async ({ welcomeNoteCount }) => {
		logger.info(`Syncing a new client on the same account ${welcomeNoteCount > 0 ? `(with ${welcomeNoteCount} initial notes)` : ''}`);
		const createClientInitialNotes = async (client: Client) => {
			if (welcomeNoteCount === 0) return;

			// Create a new folder. Usually, new clients have a default set of
			// welcome notes when first syncing.
			const parentFolder = await client.createRandomFolder({ parentId: '', quiet: false });

			for (let i = 0; i < welcomeNoteCount; i++) {
				await client.createRandomNote({ parentId: parentFolder.id });
			}
		};

		await client.sync();

		const other = await clientPool.newWithSameAccount(client);
		await createClientInitialNotes(other);

		// Sometimes, a delay is needed between client creation
		// and initial sync. Retry the initial sync and the checkState
		// on failure:
		await retryWithCount(async () => {
			await other.sync();
			await other.checkState();
		}, {
			delayOnFailure: (count) => Second * count,
			count: 3,
			onFail: async ({ error, willRetry }) => {
				logger.warn(
					'other.sync/other.checkState failed with',
					error,
					willRetry ? 'retrying...' : '',
				);
			},
		});

		await client.sync();
		return true;
	}, {
		welcomeNoteCount: () => context.randInt(0, 30),
	});

	addAction('removeClientsOnSameAccount', async () => {
		const others = clientPool.othersWithSameAccount(client);
		if (others.length === 0) return false;

		for (const otherClient of others) {
			assert.notEqual(otherClient, client);
			await otherClient.close();
		}
		return true;
	}, {});

	addAction('createOrUpdateMany', async ({ count }) => {
		await client.createOrUpdateMany(count);
		return true;
	}, {
		count: () => context.randInt(1, 512),
	});

	addAction('publishNote', async ({ id }) => {
		const note = id ? noteById(id) : await client.randomNote({
			includeReadOnly: true,
		});
		if (!note || note.published) return false;

		await client.publishNote(note.id);
		return true;
	}, {
		id: undefinedId,
	});

	addAction('unpublishNote', async ({ id }) => {
		const note = id ? noteById(id) : await client.randomNote({ includeReadOnly: true });
		if (!note || !note.published) return false;

		await client.unpublishNote(note.id);
		return true;
	}, { id: undefinedId });

	addAction('sync', async () => {
		await client.sync();
		return true;
	}, {});

	addAction('comment', async ({ message }) => {
		logger.info(`Action: Comment: ${JSON.stringify(message)}`);
		return true;
	}, { message: () => '' });

	return { actions, schema, addAction };
};

