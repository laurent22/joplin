import BaseApplication from '@joplin/lib/BaseApplication';
import ItemChange from '@joplin/lib/models/ItemChange';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import { setEncryptionEnabled } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { readFile } from 'fs/promises';
import { TextEncoder as NodeTextEncoder } from 'util';
import app from './app';

type NoteUpdateAction = {
	changeSource: number;
	changedFields: string[];
	note: NoteEntity;
	[key: string]: unknown;
};

const mockBaseMiddleware = () => {
	return jest.spyOn(BaseApplication.prototype as unknown as {
		generalMiddleware: (store: unknown, next: (action: unknown)=> unknown, action: unknown)=> Promise<unknown>;
	}, 'generalMiddleware').mockImplementation(async (_store, next, action) => next(action));
};

const createDesktopActionHandler = () => {
	const middleware = app().generalMiddlewareFn()({ getState: jest.fn() });
	return middleware(jest.fn());
};

describe('app', () => {
	const watcher = ExternalEditWatcher.instance();
	const originalTextEncoder = globalThis.TextEncoder;
	const originalNoteDispatch = Note.dispatch;
	let baseMiddlewareMock: jest.SpyInstance;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		baseMiddlewareMock = mockBaseMiddleware();
	});

	afterEach(async () => {
		Note.dispatch = originalNoteDispatch;
		baseMiddlewareMock.mockRestore();
		setEncryptionEnabled(false);
		Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: originalTextEncoder });
		await watcher.stopWatchingAll();
	});

	const startExternalEditing = async () => {
		const openItem = jest.fn();
		watcher.initialize(jest.fn(() => ({
			openItem,
		})), jest.fn());

		const originalNote = await Note.save({
			title: 'Test note',
			body: 'Original body',
		});
		await watcher.openAndWatch(originalNote);

		return {
			originalNote,
			externalFilePath: openItem.mock.calls[0][0] as string,
		};
	};

	test('should update the external edit file after a synced note changes', async () => {
		const { originalNote, externalFilePath } = await startExternalEditing();
		const syncedNote = await Note.save({
			...originalNote,
			body: 'Changed on another device',
		}, { changeSource: ItemChange.SOURCE_SYNC });
		const syncedUpdateAction = {
			type: 'NOTE_UPDATE_ONE',
			changeSource: ItemChange.SOURCE_SYNC,
			changedFields: ['body'],
			note: syncedNote,
		};

		const handleDesktopAction = createDesktopActionHandler();
		await handleDesktopAction(syncedUpdateAction);

		expect(await readFile(externalFilePath, 'utf8')).toBe(await Note.serializeForEdit(syncedNote));
	});

	test('should wait for a synced encrypted note to be decrypted before updating the external edit file', async () => {
		const { originalNote, externalFilePath } = await startExternalEditing();
		const noteActions = jest.fn();
		Note.dispatch = noteActions;

		Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: NodeTextEncoder });
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		const encryptedSyncPayload = await Note.serializeForSync({
			...originalNote,
			body: 'Changed on another device',
		} as NoteEntity);
		const encryptedNote = Note.filter(await Note.unserialize(encryptedSyncPayload));
		const savedEncryptedNote = await Note.save(encryptedNote, {
			autoTimestamp: false,
			changeSource: ItemChange.SOURCE_SYNC,
			oldItem: originalNote as unknown as Record<string, unknown>,
		});
		const encryptedSyncAction = noteActions.mock.calls[0][0] as NoteUpdateAction;

		expect(encryptedSyncAction.note.encryption_applied).toBe(1);

		const handleDesktopAction = createDesktopActionHandler();
		await handleDesktopAction(encryptedSyncAction);

		expect(await readFile(externalFilePath, 'utf8')).toBe(await Note.serializeForEdit(originalNote));

		noteActions.mockClear();
		const decryptedNote = await Note.decrypt(savedEncryptedNote);
		const decryptedAction = noteActions.mock.calls[0][0] as NoteUpdateAction;

		expect(decryptedAction.changeSource).toBe(ItemChange.SOURCE_DECRYPTION);
		expect(decryptedAction.note.encryption_applied).toBe(0);
		expect(decryptedAction.changedFields).toEqual(expect.arrayContaining(['body', 'encryption_applied']));

		await handleDesktopAction(decryptedAction);

		expect(await readFile(externalFilePath, 'utf8')).toBe(await Note.serializeForEdit(decryptedNote));
	});
});
