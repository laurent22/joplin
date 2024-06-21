import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import { User } from '../../services/database/types';
import { randomElement } from '../array';
import { CustomErrorCode } from '../errors';
import { randomWords } from './randomWords';
import { afterAllTests, beforeAllDb, createdDbPath, makeFolderSerializedBody, makeNoteSerializedBody, makeResourceSerializedBody, models, randomHash } from './testUtils';
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const nodeSqlite = require('sqlite3');

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
	userCount?: number;
	minNoteCountPerUser?: number;
	maxNoteCountPerUser?: number;
	minFolderCountPerUser?: number;
	maxFolderCountPerUser?: number;
}

interface Context {
	createdFolderIds: Record<string, string[]>;
	createdNoteIds: Record<string, string[]>;
	createdResourceIds: Record<string, string[]>;
}

enum Action {
	CreateNote = 'createNote',
	CreateFolder = 'createFolder',
	CreateNoteAndResource = 'createNoteAndResource',
	UpdateNote = 'updateNote',
	UpdateFolder = 'updateFolder',
	DeleteNote = 'deleteNote',
	DeleteFolder = 'deleteFolder',
}

const createActions = [Action.CreateNote, Action.CreateFolder, Action.CreateNoteAndResource];
const updateActions = [Action.UpdateNote, Action.UpdateFolder];
const deleteActions = [Action.DeleteNote, Action.DeleteFolder];

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

const createRandomNote = async (user: User, note: NoteEntity = null) => {
	const id = randomHash();
	const itemName = `${id}.md`;

	const serializedBody = makeNoteSerializedBody({
		id,
		title: randomWords(randomInt(1, 10)),
		...note,
	});

	const result = await models().item().saveFromRawContent(user, {
		name: itemName,
		body: Buffer.from(serializedBody),
	});

	if (result[itemName].error) throw result[itemName].error;

	return result[itemName].item;
};

const createRandomFolder = async (user: User, folder: FolderEntity = null) => {
	const id = randomHash();
	const itemName = `${id}.md`;

	const serializedBody = makeFolderSerializedBody({
		id,
		title: randomWords(randomInt(1, 5)),
		...folder,
	});

	const result = await models().item().saveFromRawContent(user, {
		name: itemName,
		body: Buffer.from(serializedBody),
	});

	if (result[itemName].error) throw result[itemName].error;

	return result[itemName].item;
};

const reactions: Record<Action, Reaction> = {
	[Action.CreateNote]: async (context, user) => {
		const item = await createRandomNote(user);
		if (!context.createdNoteIds[user.id]) context.createdNoteIds[user.id] = [];
		context.createdNoteIds[user.id].push(item.jop_id);
		return true;
	},

	[Action.CreateFolder]: async (context, user) => {
		const item = await createRandomFolder(user);
		if (!context.createdFolderIds[user.id]) context.createdFolderIds[user.id] = [];
		context.createdFolderIds[user.id].push(item.jop_id);
		return true;
	},

	[Action.CreateNoteAndResource]: async (context, user) => {
		const resourceContent = randomWords(20);
		const resourceId = randomHash();

		const metadataBody = makeResourceSerializedBody({
			id: resourceId,
			title: randomWords(5),
			size: resourceContent.length,
		});

		await models().item().saveFromRawContent(user, {
			name: `${resourceId}.md`,
			body: Buffer.from(metadataBody),
		});

		await models().item().saveFromRawContent(user, {
			name: `.resource/${resourceId}`,
			body: Buffer.from(resourceContent),
		});

		if (!context.createdResourceIds[user.id]) context.createdResourceIds[user.id] = [];
		context.createdResourceIds[user.id].push(resourceId);

		const noteItem = await createRandomNote(user, {
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
			const noteItem = await models().item().loadByJopId(user.id, noteId);
			const note = await models().item().loadAsJoplinItem(noteItem.id);
			const serialized = makeNoteSerializedBody({
				title: randomWords(10),
				...note,
			});

			await models().item().saveFromRawContent(user, {
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
			const folderItem = await models().item().loadByJopId(user.id, folderId);
			const folder = await models().item().loadAsJoplinItem(folderItem.id);
			const serialized = makeFolderSerializedBody({
				title: randomWords(5),
				...folder,
			});

			await models().item().saveFromRawContent(user, {
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
		const item = await models().item().loadByJopId(user.id, noteId, { fields: ['id'] });
		await models().item().delete(item.id, { allowNoOp: true });
		return true;
	},

	[Action.DeleteFolder]: async (context, user) => {
		const folderId = randomElement(context.createdFolderIds[user.id]);
		if (!folderId) return false;
		const item = await models().item().loadByJopId(user.id, folderId, { fields: ['id'] });
		await models().item().delete(item.id, { allowNoOp: true });
		return true;
	},
};

const randomActionKey = () => {
	const r = Math.random();
	if (r <= .5) {
		return randomElement(createActions);
	} else if (r <= .8) {
		return randomElement(updateActions);
	} else {
		return randomElement(deleteActions);
	}
};

const main = async (_options?: Options) => {
	// options = {
	// 	userCount: 10,
	// 	minNoteCountPerUser: 0,
	// 	maxNoteCountPerUser: 1000,
	// 	minFolderCountPerUser: 0,
	// 	maxFolderCountPerUser: 50,
	// 	...options,
	// };

	shimInit({ nodeSqlite });
	await beforeAllDb('populateDatabase');

	logger().info(`Populating database: ${createdDbPath()}`);

	const context: Context = {
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
		for (let i = 0; i < 20; i++) {
			promises.push((async () => {
				const user = await models().user().save({
					full_name: `Toto ${i}`,
					email: `toto${i}@example.com`,
					password: '$2a$10$/2DMDnrx0PAspJ2DDnW/PO5x5M9H1abfSPsqxlPMhYiXgDi25751u', // Password = 111111
				});

				users.push(user);

				logger().info(`Created user ${i}`);
			})());
		}
		// cSpell:enable

		await Promise.all(promises);
	}

	users = await models().user().loadByIds(users.map(u => u.id));

	// -------------------------------------------------------------
	// CREATE NOTES, FOLDERS AND RESOURCES
	// -------------------------------------------------------------

	{
		const promises = [];

		for (let i = 0; i < 1000; i++) {
			promises.push((async () => {
				const user = randomElement(users);
				const action = randomElement(createActions);
				await reactions[action](context, user);
				updateReport(action);
				logger().info(`Done action ${i}: ${action}. User: ${user.email}`);
			})());
		}

		await Promise.all(promises);
	}

	// -------------------------------------------------------------
	// CREATE/UPDATE/DELETE NOTES, FOLDERS AND RESOURCES
	// -------------------------------------------------------------

	{
		const promises = [];

		const totalActions = 5000;
		const batchSize = 1000; // Don't change this - it will fail with higher numbers
		const loopCount = Math.ceil(totalActions / batchSize);
		for (let loopIndex = 0; loopIndex < loopCount; loopIndex++) {
			for (let i = 0; i < batchSize; i++) {
				promises.push((async () => {
					const user = randomElement(users);
					const action = randomActionKey();
					try {
						const done = await reactions[action](context, user);
						if (done) updateReport(action);
						logger().info(`Done action ${i}: ${action}. User: ${user.email}${!done ? ' (Skipped)' : ''}`);
					} catch (error) {
						error.message = `Could not do action ${i}: ${action}. User: ${user.email}: ${error.message}`;
						logger().warn(error.message);
					}
				})());
			}
			await Promise.all(promises);
		}
	}

	// const changeIds = (await models().change().all()).map(c => c.id);

	// const serverDir = (await getRootDir()) + '/packages/server';

	// for (let i = 0; i < 100000; i++) {
	// 	const user = randomElement(users);
	// 	const cursor = Math.random() < .3 ? '' : randomElement(changeIds);

	// 	try {
	// 		const result1 = await models().change().delta(user.id, { cursor, limit: 1000 }, 1);
	// 		const result2 = await models().change().delta(user.id, { cursor, limit: 1000 }, 2);

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

	await afterAllTests();

	logger().info(report);
};

main().catch((error) => {
	logger().error('Fatal error', error);
	process.exit(1);
});
