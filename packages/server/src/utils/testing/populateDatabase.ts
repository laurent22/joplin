import { NoteEntity } from '@joplin/lib/services/database/types';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import { randomElement, removeElement } from '../array';
import { randomWords } from './randomWords';
import { afterAllTests, beforeAllDb, createdDbPath, createFolder, createNote, createResource, createUserAndSession, deleteItem, randomHash, updateFolder, updateNote, UserAndSession } from './testUtils';
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

type Reaction = (context: Context, sessionId: string)=> Promise<void>;

const randomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

const createRandomNote = (sessionId: string, note: NoteEntity = null) => {
	return createNote(sessionId, {
		id: randomHash(),
		title: randomWords(randomInt(1, 10)),
		...note,
	});
};

const reactions: Record<Action, Reaction> = {
	[Action.CreateNote]: async (context, sessionId) => {
		const item = await createRandomNote(sessionId);
		if (!context.createdNoteIds[sessionId]) context.createdNoteIds[sessionId] = [];
		context.createdNoteIds[sessionId].push(item.jop_id);
	},

	[Action.CreateFolder]: async (context, sessionId) => {
		const item = await createFolder(sessionId, {
			id: randomHash(),
			title: randomWords(randomInt(1, 5)),
		});
		if (!context.createdFolderIds[sessionId]) context.createdFolderIds[sessionId] = [];
		context.createdFolderIds[sessionId].push(item.jop_id);
	},

	[Action.CreateNoteAndResource]: async (context, sessionId) => {
		const item = await createResource(sessionId, {
			id: randomHash(),
			title: randomWords(randomInt(1, 5)),
		}, randomWords(randomInt(10, 100)));

		if (!context.createdResourceIds[sessionId]) context.createdResourceIds[sessionId] = [];
		context.createdResourceIds[sessionId].push(item.jop_id);

		const noteItem = await createRandomNote(sessionId, {
			body: `[](:/${item.jop_id})`,
		});

		if (!context.createdNoteIds[sessionId]) context.createdNoteIds[sessionId] = [];
		context.createdNoteIds[sessionId].push(noteItem.jop_id);
	},

	[Action.UpdateNote]: async (context, sessionId) => {
		const noteId = randomElement(context.createdNoteIds[sessionId]);
		if (!noteId) return;

		await updateNote(sessionId, {
			id: noteId,
			title: randomWords(randomInt(1, 10)),
		});
	},

	[Action.UpdateFolder]: async (context, sessionId) => {
		const folderId = randomElement(context.createdFolderIds[sessionId]);
		if (!folderId) return;

		await updateFolder(sessionId, {
			id: folderId,
			title: randomWords(randomInt(1, 10)),
		});
	},

	[Action.DeleteNote]: async (context, sessionId) => {
		const noteId = randomElement(context.createdNoteIds[sessionId]);
		if (!noteId) return;
		removeElement(context.createdNoteIds[sessionId], noteId);
		await deleteItem(sessionId, noteId);
	},

	[Action.DeleteFolder]: async (context, sessionId) => {
		const folderId = randomElement(context.createdFolderIds[sessionId]);
		if (!folderId) return;
		removeElement(context.createdFolderIds[sessionId], folderId);
		await deleteItem(sessionId, folderId);
	},
};

const randomActionKey = () => {
	return randomElement(Object.keys(reactions)) as Action;
};

const main = async (options?: Options) => {
	options = {
		userCount: 10,
		minNoteCountPerUser: 0,
		maxNoteCountPerUser: 1000,
		minFolderCountPerUser: 0,
		maxFolderCountPerUser: 50,
		...options,
	};

	shimInit({ nodeSqlite });
	await beforeAllDb('populateDatabase');

	logger().info(`Populating database: ${createdDbPath()}`);

	const userAndSessions: UserAndSession[] = [];

	for (let i = 0; i < options.userCount; i++) {
		logger().info(`Creating user ${i}`);
		userAndSessions.push(await createUserAndSession(i, false));
	}

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

	{
		const promises = [];

		for (let i = 0; i < 1000; i++) {
			const userAndSession = randomElement(userAndSessions);
			const key = randomElement(createActions);
			updateReport(key);
			promises.push((async () => {
				await reactions[key](context, userAndSession.session.id);
				logger().info(`Done action ${i}: ${key}. User: ${userAndSession.user.email}`);
			})());
		}

		await Promise.all(promises);
	}

	{
		let promises = [];

		for (let i = 0; i < 1000; i++) {
			const userAndSession = randomElement(userAndSessions);
			const key = randomActionKey();
			updateReport(key);

			promises.push((async () => {
				await reactions[key](context, userAndSession.session.id);
				logger().info(`Done action ${i}: ${key}. User: ${userAndSession.user.email}`);
			})());

			if (promises.length > 100) {
				await Promise.all(promises);
				promises = [];
			}
		}

		await Promise.all(promises);
	}

	await afterAllTests();

	logger().info(report);
};

main().catch((error) => {
	logger().error('Fatal error', error);
	process.exit(1);
});
