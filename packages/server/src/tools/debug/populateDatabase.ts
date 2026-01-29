import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import { Share, ShareUserStatus, User } from '../../services/database/types';
import { Models } from '../../models/factory';
import { randomWords } from '../../utils/testing/randomWords';
import { makeFolderSerializedBody, makeNoteSerializedBody, makeResourceSerializedBody } from '../../utils/testing/serializedItems';
import { randomElement } from '../../utils/array';
import { CustomErrorCode } from '../../utils/errors';
import uuid from '@joplin/lib/uuid';

let logger_: Logger = null;

const logger = () => {
	if (!logger_) {
		logger_ = new Logger();
		logger_.addTarget(TargetType.Console);
		logger_.setLevel(LogLevel.Debug);
	}
	return logger_;
};

export interface Options {
	userPrefix: string;
	userCount: number;
	actionCount: number;
}

interface Context {
	models: Models;
	userEmails: string[];
	createdFolderIds: Record<string, string[]>;
	createdNoteIds: Record<string, string[]>;
	createdResourceIds: Record<string, string[]>;
}

enum Action {
	CreateNote = 'createNote',
	CreateFolder = 'createFolder',
	CreateAndShareFolder = 'createAndShareFolder',
	CreateNoteAndResource = 'createNoteAndResource',
	UpdateNote = 'updateNote',
	UpdateFolder = 'updateFolder',
	DeleteNote = 'deleteNote',
	DeleteFolder = 'deleteFolder',
}

const createActions = [Action.CreateNote, Action.CreateFolder, Action.CreateNoteAndResource, Action.CreateAndShareFolder];
const createActionWeights = [0.5, 0.3, 0.1, 0.1];
const updateActions = [Action.UpdateNote, Action.UpdateFolder];
const updateActionWeights = [0.7, 0.3];
const deleteActions = [Action.DeleteNote, Action.DeleteFolder];
const deleteActionWeights = [0.7, 0.3];

const isCreateAction = (action: Action) => {
	return createActions.includes(action);
};

const isUpdateAction = (action: Action) => {
	return updateActions.includes(action);
};

const isDeleteAction = (action: Action) => {
	return deleteActions.includes(action);
};

type Reaction = (context: Context, user: User)=> Promise<boolean>;

const randomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomWeightedElement = <T> (items: T[], weights: number[]): T => {
	if (items.length !== weights.length) {
		throw new Error('Items and weights must have the same length');
	}
	// Normalize the weights so that they add up to one.
	const weightsSum = weights.reduce((a, b) => a + b, 0);
	const normalizedWeights = weights.map(w => w / weightsSum);

	// Pair items and weights
	const weightedItems = items.map((item, index) => ({ item, weight: normalizedWeights[index] }));

	let weightSum = 0;
	const value = Math.random();
	// Find the last item with `value` in its range
	for (const item of weightedItems) {
		weightSum += item.weight;
		if (weightSum > value) {
			return item.item;
		}
	}

	return null;
};

const shuffled = <T> (items: T[]) => {
	const result = [...items];
	// See: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
	for (let i = 0; i < result.length - 1; i++) {
		const targetIndex = randomInt(i, result.length - 1);
		const tmp = result[targetIndex];
		result[targetIndex] = result[i];
		result[i] = tmp;
	}
	return result;
};

const joplinIdToItem = (context: Context, user: User, parentId: string) => {
	return context.models.item().loadByName(user.id, `${parentId}.md`);
};

const createRandomNote = async (context: Context, user: User, note: NoteEntity = null) => {
	const id = uuid.create();
	const itemName = `${id}.md`;

	const parentId = randomElement(context.createdFolderIds[user.id] ?? []) ?? '';
	const parentItem = parentId ? await joplinIdToItem(context, user, parentId) : null;

	const serializedBody = makeNoteSerializedBody({
		id,
		title: randomWords(randomInt(1, 10)),
		parent_id: parentId,
		share_id: parentItem?.jop_share_id,
		...note,
	});

	const result = await context.models.item().saveFromRawContent(user, {
		name: itemName,
		body: Buffer.from(serializedBody),
	});

	if (result[itemName].error) throw result[itemName].error;

	return result[itemName].item;
};

const createRandomFolder = async (context: Context, user: User, folder: FolderEntity = null) => {
	const id = uuid.create();
	const itemName = `${id}.md`;

	const serializedBody = makeFolderSerializedBody({
		id,
		title: randomWords(randomInt(1, 5)),
		...folder,
	});

	const result = await context.models.item().saveFromRawContent(user, {
		name: itemName,
		body: Buffer.from(serializedBody),
	});

	if (result[itemName].error) throw result[itemName].error;

	const item = result[itemName].item;
	if (!context.createdFolderIds[user.id]) context.createdFolderIds[user.id] = [];
	context.createdFolderIds[user.id].push(item.jop_id);
	return item;
};

const addUserToShareWithStatus = async (context: Context, share: Share, email: string, status: ShareUserStatus) => {
	const shareUser = await context.models.shareUser().addByEmail(share.id, email, '');

	const defaultStatus = ShareUserStatus.Waiting;
	if (status !== defaultStatus) {
		await context.models.shareUser().setStatus(share.id, shareUser.user_id, status);
	}
};

const reactions: Record<Action, Reaction> = {
	[Action.CreateNote]: async (context, user) => {
		const item = await createRandomNote(context, user);
		if (!context.createdNoteIds[user.id]) context.createdNoteIds[user.id] = [];
		context.createdNoteIds[user.id].push(item.jop_id);
		return true;
	},

	[Action.CreateFolder]: async (context, user) => {
		const item = await createRandomFolder(context, user);
		if (!context.createdFolderIds[user.id]) context.createdFolderIds[user.id] = [];
		context.createdFolderIds[user.id].push(item.jop_id);
		return true;
	},

	[Action.CreateAndShareFolder]: async (context, user) => {
		const item = await createRandomFolder(context, user);
		const share = await context.models.share().shareFolder(user, item.jop_id, '');

		// Tag the folder with the share ID so that items created within
		// the folder can be part of the share:
		const folder = await context.models.item().loadAsJoplinItem<FolderEntity>(item.id);
		const serialized = makeFolderSerializedBody({
			...folder,
			share_id: share.id,
		});
		await context.models.item().saveFromRawContent(user, {
			name: `${folder.id}.md`,
			body: Buffer.from(serialized),
		});

		// Add users to the share
		for (const email of shuffled(context.userEmails)) {
			const status = randomWeightedElement([
				ShareUserStatus.Accepted,
				ShareUserStatus.Waiting,
				ShareUserStatus.Rejected,
			], [0.8, 0.1, 0.1]);
			await addUserToShareWithStatus(context, share, email, status);

			if (Math.random() < 0.1) break;
		}

		return true;
	},

	[Action.CreateNoteAndResource]: async (context, user) => {
		const resourceContent = randomWords(20);
		const resourceId = uuid.create();

		const metadataBody = makeResourceSerializedBody({
			id: resourceId,
			title: randomWords(5),
			size: resourceContent.length,
		});

		await context.models.item().saveFromRawContent(user, {
			name: `${resourceId}.md`,
			body: Buffer.from(metadataBody),
		});

		await context.models.item().saveFromRawContent(user, {
			name: `.resource/${resourceId}`,
			body: Buffer.from(resourceContent),
		});

		if (!context.createdResourceIds[user.id]) context.createdResourceIds[user.id] = [];
		context.createdResourceIds[user.id].push(resourceId);

		const noteItem = await createRandomNote(context, user, {
			body: `[](:/${resourceId})`,
		});

		if (!context.createdNoteIds[user.id]) context.createdNoteIds[user.id] = [];
		context.createdNoteIds[user.id].push(noteItem.jop_id);

		return true;
	},

	[Action.UpdateNote]: async (context, user) => {
		const noteId = randomElement(context.createdNoteIds[user.id]);
		if (!noteId) return false;

		try {
			const noteItem = await context.models.item().loadByJopId(user.id, noteId);
			if (!noteItem) return false;
			const note = await context.models.item().loadAsJoplinItem<NoteEntity>(noteItem.id);
			const serialized = makeNoteSerializedBody({
				title: randomWords(10),
				...note,
			});

			await context.models.item().saveFromRawContent(user, {
				name: `${note.id}.md`,
				body: Buffer.from(serialized),
			});
		} catch (error) {
			if (error.code === CustomErrorCode.NotFound) return false;
			throw error;
		}

		return true;
	},

	[Action.UpdateFolder]: async (context, user) => {
		const folderId = randomElement(context.createdFolderIds[user.id]);
		if (!folderId) return false;

		try {
			const folderItem = await context.models.item().loadByJopId(user.id, folderId);
			const folder = await context.models.item().loadAsJoplinItem<FolderEntity>(folderItem.id);
			const serialized = makeFolderSerializedBody({
				title: randomWords(5),
				...folder,
			});

			await context.models.item().saveFromRawContent(user, {
				name: `${folder.id}.md`,
				body: Buffer.from(serialized),
			});
		} catch (error) {
			if (error.code === CustomErrorCode.NotFound) return false;
			throw error;
		}

		return true;
	},

	[Action.DeleteNote]: async (context, user) => {
		const noteId = randomElement(context.createdNoteIds[user.id]);
		if (!noteId) return false;
		const item = await context.models.item().loadByJopId(user.id, noteId, { fields: ['id'] });
		if (!item) return false;
		await context.models.item().delete(item.id, { allowNoOp: true });
		return true;
	},

	[Action.DeleteFolder]: async (context, user) => {
		const folderId = randomElement(context.createdFolderIds[user.id]);
		if (!folderId) return false;
		const item = await context.models.item().loadByJopId(user.id, folderId, { fields: ['id'] });
		await context.models.item().delete(item.id, { allowNoOp: true });
		return true;
	},
};

const randomActionKey = () => {
	const r = Math.random();
	if (r <= .35) {
		return randomWeightedElement(createActions, createActionWeights);
	} else if (r <= .8) {
		return randomWeightedElement(updateActions, updateActionWeights);
	} else {
		return randomWeightedElement(deleteActions, deleteActionWeights);
	}
};

const populateDatabase = async (models: Models, options: Options) => {
	logger().info('Populating database...');
	const createActionCount = Math.ceil(options.actionCount / 16);
	const postCreateActionCount = options.actionCount - createActionCount;

	const context: Context = {
		models,
		userEmails: [],
		createdNoteIds: {},
		createdFolderIds: {},
		createdResourceIds: {},
	};

	const report = {
		created: 0,
		updated: 0,
		deleted: 0,
	};

	const updateReport = (action: Action) => {
		if (isCreateAction(action)) report.created++;
		if (isUpdateAction(action)) report.updated++;
		if (isDeleteAction(action)) report.deleted++;
	};

	let users: User[] = [];

	// -------------------------------------------------------------
	// CREATE USERS
	// -------------------------------------------------------------

	{
		const promises = [];

		// cSpell:disable
		for (let i = 0; i < options.userCount; i++) {
			promises.push((async () => {
				const email = `${options.userPrefix}-toto${i}@example.com`;
				const user = await models.user().save({
					full_name: `Toto ${i}`,
					email,
					password: '$2a$10$/2DMDnrx0PAspJ2DDnW/PO5x5M9H1abfSPsqxlPMhYiXgDi25751u', // Password = 111111
				});

				users.push(user);
				context.userEmails.push(email);

				logger().info(`Created user ${i}`);
			})());
		}
		// cSpell:enable

		await Promise.all(promises);
	}

	users = await models.user().loadByIds(users.map(u => u.id));

	// -------------------------------------------------------------
	// CREATE NOTES, FOLDERS AND RESOURCES
	// -------------------------------------------------------------

	{
		// Keep the batch size small. Doing so allows future actions to use a larger number
		// of parent items.
		const batchSize = 10;
		for (let i = 0; i < createActionCount; i += batchSize) {
			const promises = [];

			for (let j = 0; j < batchSize; j++) {
				promises.push((async () => {
					const user = randomElement(users);
					const action = randomWeightedElement(createActions, createActionWeights);
					await reactions[action](context, user);
					updateReport(action);
					logger().info(`Done action ${i}: ${action}. User: ${user.email}`);
				})());
			}

			await Promise.all(promises);
		}

	}

	// -------------------------------------------------------------
	// CREATE/UPDATE/DELETE NOTES, FOLDERS AND RESOURCES
	// -------------------------------------------------------------

	{
		const promises = [];

		const batchSize = 200; // Don't change this - it will fail with higher numbers
		const loopCount = Math.ceil(postCreateActionCount / batchSize);
		for (let loopIndex = 0; loopIndex < loopCount; loopIndex++) {
			for (let i = 0; i < batchSize; i++) {
				promises.push((async () => {
					const user = randomElement(users);
					const action = randomActionKey();
					try {
						const done = await reactions[action](context, user);
						if (done) updateReport(action);
						logger().info(`Done action ${loopIndex}.${i}: ${action}. User: ${user.email}${!done ? ' (Skipped)' : ''}`);
					} catch (error) {
						error.message = `Could not do action ${loopIndex}.${i}: ${action}. User: ${user.email}: ${error.message}`;
						logger().warn(error.message);
					}
				})());
			}
			await Promise.all(promises);
		}
	}

	// const changeIds = (await models.change().all()).map(c => c.id);

	// const serverDir = (await getRootDir()) + '/packages/server';

	// for (let i = 0; i < 100000; i++) {
	// 	const user = randomElement(users);
	// 	const cursor = Math.random() < .3 ? '' : randomElement(changeIds);

	// 	try {
	// 		const result1 = await models.change().delta(user.id, { cursor, limit: 1000 }, 1);
	// 		const result2 = await models.change().delta(user.id, { cursor, limit: 1000 }, 2);

	// 		logger().info('Test ' + i + ': Found ' + result1.items.length + ' and ' + result2.items.length + ' items');

	// 		if (JSON.stringify(result1) !== JSON.stringify(result2)) {
	// 			await writeFile(serverDir + '/result1.json', JSON.stringify(result1.items, null, '\t'));
	// 			await writeFile(serverDir + '/result2.json', JSON.stringify(result2.items, null, '\t'));
	// 			throw new Error('Found different results');
	// 		}
	// 	} catch (error) {
	// 		error.message = 'User ' + user.id + ', Cursor ' + cursor + ': ' + error.message;
	// 		throw error;
	// 	}
	// }

	logger().info(report);
};

export default populateDatabase;
