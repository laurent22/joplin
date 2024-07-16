import * as fs from 'fs-extra';
import eventManager, { EventName, ItemChangeEvent } from '../../../eventManager';
import { ModelType } from '../../../BaseModel';
import Note from '../../../models/Note';
import { join } from 'path';
import { NoteEntity } from '../../database/types';
import { setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import reducer, { defaultState } from '../../../reducer';
import { createStore } from 'redux';
import BaseItem from '../../../models/BaseItem';
import FolderMirroringService from '../FolderMirroringService';
const md5 = require('md5');


type ShouldMatchItemCallback = (item: NoteEntity)=> boolean;
export const waitForNoteChange = (itemMatcher?: ShouldMatchItemCallback) => {
	return new Promise<void>(resolve => {
		const onResolve = () => {
			eventManager.off(EventName.ItemChange, eventHandler);
			resolve();
		};

		const eventHandler = async (event: ItemChangeEvent) => {
			if (event.itemType !== ModelType.Note) return;

			if (!itemMatcher) {
				onResolve();
			} else if (itemMatcher(await Note.load(event.itemId))) {
				onResolve();
			}
		};

		eventManager.on(EventName.ItemChange, eventHandler);
	});
};

export const waitForTestNoteToBeWritten = async (parentDir: string) => {
	// Push a new writeFile task to the end of the action queue and wait for it.
	const waitForActionsToComplete = waitForNoteChange(item => item.body === 'waitForActionsToComplete');
	await fs.writeFile(join(parentDir, 'waitForQueue.md'), 'waitForActionsToComplete', 'utf8');
	await waitForActionsToComplete;

	const waitForDeleteAction = waitForNoteChange(item => item.body === 'waitForActionsToComplete');
	await fs.remove(join(parentDir, 'waitForQueue.md'));
	await waitForDeleteAction;
};

export const setUpFolderMirror = async () => {
	await setupDatabaseAndSynchronizer(1);
	await switchClient(1);

	const testReducer = (state = defaultState, action: unknown) => {
		return reducer(state, action);
	};
	const store = createStore(testReducer);

	BaseItem.dispatch = store.dispatch;

	// Needed for AsyncActionQueue
	jest.useRealTimers();
};

export const resetFolderMirror = async () => {
	await FolderMirroringService.instance().reset();
};

export const mirrorAndWatchFolder = async (folderPath: string, folderId: string) => {
	let uuidCreationCount = 0;
	const createUuid = () => {
		const result = md5(uuidCreationCount++);
		return result;
	};
	return await FolderMirroringService.instance().mirrorFolder(folderPath, folderId, createUuid);
};
