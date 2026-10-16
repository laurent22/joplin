import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { NoteEntity } from '../database/types';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient, simulateReadOnlyShareEnv } from '../../testing/test-utils';
import shim from '../../shim';
import eventManager, { EventName } from '../../eventManager';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey from './NoteLockKey';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import bulkSetNoteLockState, { folderTreeNoteIds, promptAndBulkSetNoteLockState } from './bulkSetNoteLockState';

const setUpUnlockedSession = async (password = '123456') => {
	await NoteLockKey.instance().create(password);
	await NoteLockSession.instance().unlock(password);
};

const createLockedNote = async (props: NoteEntity) => {
	return Note.save({ ...props, is_locked: 1 }, { useNoteLock: true });
};

// What a sync leaves behind when the sync target uses a different note lock key.
const simulateMigrationNeeded = () => {
	Setting.setValue('noteLock.conflictNoteLockKey', { noteLockKey: { id: 'target-key' }, syncMigrationId: 'target-migration' });
};

const prompts = { promptPassword: async () => '123456', goToNoteLockSetup: jest.fn() };

describe('bulkSetNoteLockState', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		Setting.setValue('featureFlag.noteLock', true);
	});

	afterEach(() => {
		Setting.setValue('featureFlag.noteLock', false);
		Setting.setValue('noteLock.conflictNoteLockKey', {});
		jest.restoreAllMocks();
	});

	it('should lock the notes in a notebook and its sub-notebooks', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const subFolder = await Folder.save({ title: 'sub', parent_id: folder.id });
		const otherFolder = await Folder.save({ title: 'other' });
		const note1 = await Note.save({ title: 'one', body: 'secret one', parent_id: folder.id });
		const note2 = await Note.save({ title: 'two', body: 'secret two', parent_id: subFolder.id });
		const alreadyLocked = await createLockedNote({ title: 'locked', body: 'secret locked', parent_id: folder.id });
		const otherNote = await Note.save({ title: 'out', body: 'out of scope', parent_id: otherFolder.id });

		const result = await bulkSetNoteLockState(await folderTreeNoteIds(folder.id), true);

		expect(result).toEqual({ changed: 2, skipped: 1, failed: 0 });
		for (const id of [note1.id, note2.id, alreadyLocked.id]) {
			const note = await Note.load(id);
			expect(note.is_locked).toBe(1);
			expect(note.body).not.toContain('secret');
		}
		expect((await Note.load(note1.id, { useNoteLock: true })).body).toBe('secret one');
		expect((await Note.load(otherNote.id)).is_locked).toBe(0);
	});

	it('should remove the note lock from the selected notes', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await createLockedNote({ title: 'one', body: 'secret one', parent_id: folder.id });
		const note2 = await createLockedNote({ title: 'two', body: 'secret two', parent_id: folder.id });
		const notSelected = await createLockedNote({ title: 'three', body: 'secret three', parent_id: folder.id });
		const plainNote = await Note.save({ title: 'plain', body: 'already plain', parent_id: folder.id });

		const result = await bulkSetNoteLockState([note1.id, note2.id, plainNote.id], false);

		expect(result).toEqual({ changed: 2, skipped: 1, failed: 0 });
		expect(await Note.load(note1.id)).toMatchObject({ is_locked: 0, body: 'secret one' });
		expect(await Note.load(note2.id)).toMatchObject({ is_locked: 0, body: 'secret two' });
		expect((await Note.load(notSelected.id)).is_locked).toBe(1);
	});

	it('should skip notes in a read-only share', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const sharedNote = await Note.save({ title: 'shared', body: 'shared body', parent_id: folder.id, share_id: 'share-1' });
		const cleanup = simulateReadOnlyShareEnv('share-1');
		try {
			const result = await bulkSetNoteLockState([sharedNote.id], true);
			expect(result).toEqual({ changed: 0, skipped: 1, failed: 0 });
		} finally {
			cleanup();
		}
		expect((await Note.load(sharedNote.id)).is_locked).toBe(0);
	});

	test.each([
		['lock', false, true],
		['unlock', true, false],
	])('should still %s the remaining notes when the session locks mid-run', async (_label, startLocked, isLocked) => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const makeNote = (props: NoteEntity) => startLocked ? createLockedNote(props) : Note.save(props);
		const note1 = await makeNote({ title: 'one', body: 'secret one', parent_id: folder.id });
		const note2 = await makeNote({ title: 'two', body: 'secret two', parent_id: folder.id });

		const save = Note.save.bind(Note);
		jest.spyOn(Note, 'save').mockImplementation(async (note, options) => {
			const saved = await save(note, options);
			NoteLockSession.instance().lock();
			return saved;
		});

		expect(await bulkSetNoteLockState([note1.id, note2.id], isLocked)).toEqual({ changed: 2, skipped: 0, failed: 0 });
		for (const id of [note1.id, note2.id]) {
			expect((await Note.load(id)).is_locked).toBe(isLocked ? 1 : 0);
		}
	});

	it('should count a note that fails and still change the others', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		// A null byte in the plaintext body makes the unlocked save fail validation.
		const badNote = await createLockedNote({ title: 'bad', body: `bad${String.fromCharCode(0)}body`, parent_id: folder.id });
		const goodNote = await createLockedNote({ title: 'good', body: 'good body', parent_id: folder.id });

		expect(await bulkSetNoteLockState([badNote.id, goodNote.id], false)).toEqual({ changed: 1, skipped: 0, failed: 1 });
		expect((await Note.load(badNote.id)).is_locked).toBe(1);
		expect(await Note.load(goodNote.id)).toMatchObject({ is_locked: 0, body: 'good body' });
	});

	test.each([
		['lock', 'after', false, true],
		['unlock', 'after', true, false],
		['lock', 'during', false, true],
		['unlock', 'during', true, false],
	])('should stop when the feature is turned off mid-run (%s, %s the load)', async (_label, timing, startLocked, isLocked) => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const makeNote = (props: NoteEntity) => startLocked ? createLockedNote(props) : Note.save(props);
		const note1 = await makeNote({ title: 'one', body: 'secret one', parent_id: folder.id });
		const note2 = await makeNote({ title: 'two', body: 'secret two', parent_id: folder.id });
		const before = await Note.load(note1.id);

		const load = Note.load.bind(Note);
		jest.spyOn(Note, 'load').mockImplementation(async (id, options) => {
			const turnOff = () => { if (options?.useNoteLock) Setting.setValue('featureFlag.noteLock', false); };
			if (timing === 'during') turnOff();
			const note = await load(id, options);
			if (timing === 'after') turnOff();
			return note;
		});

		await expect(bulkSetNoteLockState([note1.id, note2.id], isLocked)).rejects.toThrow('cancelled because the note lock feature was turned off');
		jest.restoreAllMocks();
		expect(await Note.load(note1.id)).toMatchObject({ is_locked: before.is_locked, body: before.body });
		expect((await Note.load(note2.id)).is_locked).toBe(startLocked ? 1 : 0);
	});

	it('should notify an open editor of each change', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'one', body: 'secret one' });
		const listener = jest.fn();
		eventManager.on(EventName.NoteLockNoteStateChange, listener);
		try {
			await bulkSetNoteLockState([note.id], true);
		} finally {
			eventManager.off(EventName.NoteLockNoteStateChange, listener);
		}
		expect(listener).toHaveBeenCalledWith({ noteId: note.id, isLocked: true });
	});

	it('should fail closed when the session is locked', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'one', body: 'secret' });
		NoteLockSession.instance().lock();
		await expect(bulkSetNoteLockState([note.id], true)).rejects.toThrow();
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	it('should change nothing when the password prompt is cancelled', async () => {
		await NoteLockKey.instance().create('123456');
		const note = await Note.save({ title: 'one', body: 'secret' });
		const beforeChange = jest.fn();

		await promptAndBulkSetNoteLockState([note.id], true, { promptPassword: async () => null, goToNoteLockSetup: jest.fn() }, jest.fn(), beforeChange);

		expect((await Note.load(note.id)).is_locked).toBe(0);
		expect(beforeChange).not.toHaveBeenCalled();
	});

	it('should unlock the session and report the notes that failed', async () => {
		await setUpUnlockedSession();
		const badNote = await createLockedNote({ title: 'bad', body: `bad${String.fromCharCode(0)}body` });
		const goodNote = await createLockedNote({ title: 'good', body: 'good body' });
		NoteLockSession.instance().lock();
		const showErrorDialog = jest.spyOn(shim, 'showErrorDialog').mockResolvedValue(undefined);

		await promptAndBulkSetNoteLockState([badNote.id, goodNote.id], false, prompts, jest.fn());

		expect((await Note.load(goodNote.id)).is_locked).toBe(0);
		expect(showErrorDialog).toHaveBeenCalledWith('The note lock could not be removed from 1 note.');
	});

	it('should show the in-progress banner only while the notes change', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'one', body: 'secret' });
		const dispatch = jest.fn();
		let bannerDuringSave: boolean = null;
		const save = Note.save.bind(Note);
		jest.spyOn(Note, 'save').mockImplementation(async (n, options) => {
			bannerDuringSave = dispatch.mock.calls[dispatch.mock.calls.length - 1][0].value;
			return save(n, options);
		});

		await promptAndBulkSetNoteLockState([note.id], true, prompts, dispatch);

		expect(bannerDuringSave).toBe(true);
		expect(dispatch).toHaveBeenLastCalledWith({ type: 'NOTE_LOCK_BULK_CHANGE_RUNNING_SET', value: false });
		expect((await Note.load(note.id)).is_locked).toBe(1);
	});

	it('should refuse a second run while one is going', async () => {
		await setUpUnlockedSession();
		const note1 = await Note.save({ title: 'one', body: 'secret one' });
		const note2 = await Note.save({ title: 'two', body: 'secret two' });
		const showErrorDialog = jest.spyOn(shim, 'showErrorDialog').mockResolvedValue(undefined);
		let secondRun: Promise<void> = null;
		const save = Note.save.bind(Note);
		jest.spyOn(Note, 'save').mockImplementation(async (n, options) => {
			secondRun ??= promptAndBulkSetNoteLockState([note2.id], true, prompts, jest.fn());
			return save(n, options);
		});

		await promptAndBulkSetNoteLockState([note1.id], true, prompts, jest.fn());
		await secondRun;
		jest.restoreAllMocks();

		expect(showErrorDialog).toHaveBeenCalledWith('Please wait until the current note lock change has finished.');
		expect((await Note.load(note1.id)).is_locked).toBe(1);
		expect((await Note.load(note2.id)).is_locked).toBe(0);

		await promptAndBulkSetNoteLockState([note2.id], true, prompts, jest.fn());
		expect((await Note.load(note2.id)).is_locked).toBe(1);
	});

	it('should refuse to start while a migration is needed, before asking for the password', async () => {
		await NoteLockKey.instance().create('123456');
		const note = await Note.save({ title: 'one', body: 'secret' });
		simulateMigrationNeeded();
		const promptPassword = jest.fn();
		const showErrorDialog = jest.spyOn(shim, 'showErrorDialog').mockResolvedValue(undefined);

		await promptAndBulkSetNoteLockState([note.id], true, { promptPassword, goToNoteLockSetup: jest.fn() }, jest.fn());

		expect(promptPassword).not.toHaveBeenCalled();
		expect(showErrorDialog).toHaveBeenCalledWith('The note lock cannot be changed while your locked notes need to be migrated to the synced key.');
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	it('should cancel the remaining notes once a migration is needed', async () => {
		await setUpUnlockedSession();
		const note1 = await Note.save({ title: 'one', body: 'secret one' });
		const note2 = await Note.save({ title: 'two', body: 'secret two' });
		const save = Note.save.bind(Note);
		jest.spyOn(Note, 'save').mockImplementation(async (n, options) => {
			const saved = await save(n, options);
			simulateMigrationNeeded();
			return saved;
		});

		await expect(bulkSetNoteLockState([note1.id, note2.id], true)).rejects.toThrow('need to be migrated');
		jest.restoreAllMocks();

		expect((await Note.load(note1.id)).is_locked).toBe(1);
		expect((await Note.load(note2.id)).is_locked).toBe(0);
	});

});
