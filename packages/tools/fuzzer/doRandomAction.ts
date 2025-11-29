import uuid from '@joplin/lib/uuid';
import Client from './Client';
import ClientPool from './ClientPool';
import { FuzzContext } from './types';
import { strict as assert } from 'assert';
import Logger from '@joplin/utils/Logger';
import retryWithCount from './utils/retryWithCount';
import { Second } from '@joplin/utils/time';

const logger = Logger.create('doRandomAction');

const doRandomAction = async (context: FuzzContext, client: Client, clientPool: ClientPool) => {
	const selectOrCreateParentFolder = async () => {
		let parentId = (await client.randomFolder({ includeReadOnly: false }))?.id;

		// Create a toplevel folder to serve as this
		// folder's parent if none exist yet
		if (!parentId) {
			parentId = uuid.create();
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
				parentId: await selectOrCreateParentFolder(),
				id: uuid.create(),
				title: 'Test note',
				body: 'Body',
			});

			note = await client.randomNote(options);
			assert.ok(note, 'should have selected a random note');
		}

		return note;
	};

	const actions = {
		newSubfolder: async () => {
			const parentId = await selectOrCreateParentFolder();
			await client.createRandomFolder(parentId, { quiet: false });

			return true;
		},
		newToplevelFolder: async () => {
			await client.createRandomFolder('', { quiet: false });
			return true;
		},
		newNote: async () => {
			const parentId = await selectOrCreateParentFolder();
			await client.createRandomNote(parentId);

			return true;
		},
		renameNote: async () => {
			const note = await selectOrCreateWriteableNote();

			await client.updateNote({
				...note,
				title: `Renamed (${context.randInt(0, 1000)})`,
			});

			return true;
		},
		updateNoteBody: async () => {
			const note = await selectOrCreateWriteableNote();

			await client.updateNote({
				...note,
				body: `${note.body}\n\nUpdated.\n`,
			});

			return true;
		},
		moveNote: async () => {
			const note = await selectOrCreateWriteableNote();
			const targetParent = await client.randomFolder({
				filter: folder => folder.id !== note.parentId,
				includeReadOnly: false,
			});
			if (!targetParent) return false;

			await client.moveItem(note.id, targetParent.id);

			return true;
		},
		deleteNote: async () => {
			const target = await client.randomNote({ includeReadOnly: false });
			if (!target) return false;

			await client.deleteNote(target.id);
			return true;
		},
		shareFolder: async () => {
			const other = clientPool.randomClient(c => !c.hasSameAccount(client));
			if (!other) return false;

			const target = await client.randomFolder({
				filter: candidate => {
					const isToplevel = !candidate.parentId;
					const ownedByCurrent = candidate.ownedByEmail === client.email;
					const alreadyShared = isToplevel && candidate.isSharedWith(other.email);
					return isToplevel && ownedByCurrent && !alreadyShared;
				},
				includeReadOnly: true,
			});
			if (!target) return false;

			const readOnly = context.randInt(0, 2) === 1 && context.isJoplinCloud;
			await client.shareFolder(target.id, other, { readOnly });
			return true;
		},
		unshareFolder: async () => {
			const target = await client.randomFolder({
				filter: candidate => {
					return candidate.isRootSharedItem && candidate.ownedByEmail === client.email;
				},
				includeReadOnly: true,
			});
			if (!target) return false;

			const recipientIndex = context.randInt(-1, target.shareRecipients.length);
			if (recipientIndex === -1) { // Completely remove the share
				await client.deleteAssociatedShare(target.id);
			} else {
				const recipientEmail = target.shareRecipients[recipientIndex];
				const recipient = clientPool.clientsByEmail(recipientEmail)[0];
				assert.ok(recipient, `invalid state -- recipient ${recipientEmail} should exist`);
				await client.removeFromShare(target.id, recipient);
			}
			return true;
		},
		deleteFolder: async () => {
			const target = await client.randomFolder({ includeReadOnly: false });
			if (!target) return false;

			await client.deleteFolder(target.id);
			return true;
		},
		moveFolderToToplevel: async () => {
			const target = await client.randomFolder({
				// Don't choose items that are already toplevel
				filter: item => !!item.parentId,
				includeReadOnly: false,
			});
			if (!target) return false;

			await client.moveItem(target.id, '');
			return true;
		},
		moveFolderTo: async () => {
			const target = await client.randomFolder({
				// Don't move shared folders (should not be allowed by the GUI in the main apps).
				filter: item => !item.isRootSharedItem,
				includeReadOnly: false,
			});
			if (!target) return false;

			const targetDescendants = new Set(await client.allFolderDescendants(target.id));

			const newParent = await client.randomFolder({
				filter: (item) => {
					// Avoid making the folder a child of itself
					return !targetDescendants.has(item.id);
				},
				includeReadOnly: false,
			});
			if (!newParent) return false;

			await client.moveItem(target.id, newParent.id);
			return true;
		},
		newClientOnSameAccount: async () => {
			const welcomeNoteCount = context.randInt(0, 30);
			logger.info(`Syncing a new client on the same account ${welcomeNoteCount > 0 ? `(with ${welcomeNoteCount} initial notes)` : ''}`);
			const createClientInitialNotes = async (client: Client) => {
				if (welcomeNoteCount === 0) return;

				// Create a new folder. Usually, new clients have a default set of
				// welcome notes when first syncing.
				const parentFolder = await client.createRandomFolder('', { quiet: false });

				for (let i = 0; i < welcomeNoteCount; i++) {
					await client.createRandomNote(parentFolder.id);
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
				onFail: async (error) => {
					logger.warn('other.sync/other.checkState failed with', error, 'retrying...');
				},
			});

			await client.sync();
			return true;
		},
		removeClientsOnSameAccount: async () => {
			const others = clientPool.othersWithSameAccount(client);
			if (others.length === 0) return false;

			for (const otherClient of others) {
				assert.notEqual(otherClient, client);
				await otherClient.close();
			}
			return true;
		},
		createOrUpdateMany: async () => {
			await client.createOrUpdateMany(context.randInt(1, 512));
			return true;
		},
		publishNote: async () => {
			const note = await client.randomNote({
				includeReadOnly: true,
			});
			if (!note || note.published) return false;

			await client.publishNote(note.id);
			return true;
		},
		unpublishNote: async () => {
			const note = await client.randomNote({ includeReadOnly: true });
			if (!note || !note.published) return false;

			await client.unpublishNote(note.id);
			return true;
		},
	};

	const actionKeys = [...Object.keys(actions)] as (keyof typeof actions)[];

	let result = false;
	while (!result) { // Loop until an action was done
		const randomAction = context.randomFrom(actionKeys);
		logger.info(`Action: ${randomAction} in ${client.email}`);
		result = await actions[randomAction]();
		if (!result) {
			logger.info(`  ${randomAction} was skipped (preconditions not met).`);
		}
	}
};

export default doRandomAction;
