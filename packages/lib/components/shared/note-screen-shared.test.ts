import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Setting from '../../models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import shared, { BaseNoteScreenComponent, BaseState } from './note-screen-shared';
import NoteLockNote from '../../services/noteLock/NoteLockNote';
import NoteLockService, { ScopedNoteLockService } from '../../services/noteLock/NoteLockService';
import NoteLockSession from '../../services/noteLock/NoteLockSession';
import { NoteEntity } from '../../services/database/types';

const deferred = <T>() => {
	let resolve: (value: T)=> void;
	const promise = new Promise<T>(resolvePromise => {
		resolve = resolvePromise;
	});
	return { promise, resolve: resolve! };
};

const newComponent = () => ({
	props: {
		provisionalNoteIds: [],
		noteId: 'note-id',
		folders: [],
		sharedData: undefined,
		noteVisiblePanes: ['editor'],
	},
	state: { mode: 'edit' },
	setState: jest.fn(),
	scheduleFocusUpdate: jest.fn(),
}) as unknown as BaseNoteScreenComponent;



const makeComp = (note: NoteEntity, stateOverrides: Partial<BaseState> = {}): BaseNoteScreenComponent => {
	return {
		props: {
			provisionalNoteIds: [],
			noteId: note.id,
			folders: [],
			sharedData: undefined,
			noteVisiblePanes: ['viewer'],
		},
		state: {
			note: { ...note },
			lastSavedNote: { ...note },
			newAndNoTitleChangeNoteId: false,
			mode: 'view',
			folder: null,
			isLoading: false,
			fromShare: false,
			noteResources: {},
			readOnly: false,
			noteLastLoadTime: 0,
			noteLockKey: null,
			...stateOverrides,
		},
		setState: function(newState: Partial<BaseState>) {
			this.state = { ...this.state, ...newState };
		},
		scheduleSave: () => {},
		scheduleFocusUpdate: () => {},
		attachFile: () => {},
	};
};

const mockUnlockedSession = () => {
	jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(true);
	jest.spyOn(NoteLockSession.instance(), 'decryptedKey').mockReturnValue({ id: 'key-id', plainText: 'key' });
	jest.spyOn(NoteLockService, 'withDecryptedKey').mockImplementation(
		async callback => callback({ encryptString: async (text: string) => `enc(${text})` } as ScopedNoteLockService),
	);
	jest.spyOn(NoteLockNote, 'decryptBody').mockImplementation(async note => ({
		...note,
		isDecrypted: !!note.is_locked,
		body: note.is_locked ? String(note.body).replace(/^enc\(([\s\S]*)\)$/, '$1') : note.body,
	}));
};

// Every save of a locked note body must be gated, so plaintext never reaches the database
// (including the transient save when a deleted note is recreated).
const expectGatedLockedSaves = (saveSpy: jest.SpyInstance) => {
	for (const [note, options] of saveSpy.mock.calls) {
		if ((note as NoteEntity).is_locked && 'body' in (note as NoteEntity)) {
			expect((options as { useNoteLock?: boolean })?.useNoteLock).toBe(true);
		}
	}
};

describe('note-screen-shared', () => {
	let folderId = '';

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('featureFlag.noteLock', true);
		folderId = (await Folder.save({ title: 'folder' })).id;
	});

	afterEach(() => {
		Setting.setValue('featureFlag.noteLock', false);
		jest.restoreAllMocks();
	});

	it('should not expose a locked note body while the session is locked, and decrypt it while unlocked', async () => {
		// A direct save of a new note with is_locked keeps the raw body, standing in for ciphertext.
		const testNote = await Note.save({ title: 'Locked', body: 'ciphertext', is_locked: 1, parent_id: folderId });

		jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(false);
		const lockedComp = makeComp(testNote);
		await shared.reloadNote(lockedComp);
		// The encrypted body stays in both state notes, so a diff-based save cannot write it.
		expect(lockedComp.state.note.body).toBe('ciphertext');
		expect(lockedComp.state.lastSavedNote.body).toBe('ciphertext');
		expect(lockedComp.state.readOnly).toBe(true);
		expect(lockedComp.state.mode).toBe('view');
		expect(lockedComp.state.noteLockKey).toBeNull();

		jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(true);
		jest.spyOn(NoteLockSession.instance(), 'decryptedKey').mockReturnValue({ id: 'key-id', plainText: 'key' });
		jest.spyOn(NoteLockNote, 'decryptBody').mockImplementation(async note => ({ ...note, body: 'secret content' }));
		const unlockedComp = makeComp(testNote);
		await shared.reloadNote(unlockedComp);
		expect(unlockedComp.state.note.body).toBe('secret content');
		expect(unlockedComp.state.readOnly).toBe(false);
		expect(unlockedComp.state.noteLockKey).toEqual({ id: 'key-id', plainText: 'key' });
	});

	it('should report a locked note as undecryptable only when the session is still unlocked', async () => {
		const testNote = await Note.save({ title: 'Locked', body: 'ciphertext', is_locked: 1, parent_id: folderId });

		jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(true);
		jest.spyOn(NoteLockSession.instance(), 'decryptedKey').mockReturnValue({ id: 'key-id', plainText: 'key' });
		jest.spyOn(NoteLockNote, 'decryptBody').mockRejectedValue(new Error('OperationError'));

		const undecryptableComp = makeComp(testNote);
		await shared.reloadNote(undecryptableComp);
		expect(undecryptableComp.state.noteLockUndecryptable).toBe(true);
		expect(undecryptableComp.state.note.body).toBe('ciphertext');
		expect(undecryptableComp.state.readOnly).toBe(true);
		expect(undecryptableComp.state.noteLockKey).toBeNull();

		// Unlocked when the load starts, locked by the time the key is captured: still recoverable.
		jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValueOnce(true).mockReturnValue(false);
		jest.spyOn(NoteLockNote, 'decryptBody').mockImplementation(async note => ({ ...note, body: 'secret content' }));
		jest.spyOn(NoteLockSession.instance(), 'decryptedKey').mockImplementation(() => {
			throw new Error('Note lock session is locked');
		});

		const racedComp = makeComp(testNote);
		await shared.reloadNote(racedComp);
		expect(racedComp.state.noteLockUndecryptable).toBe(false);
		expect(racedComp.state.note.body).toBe('ciphertext');
	});

	it('should persist the encrypted body together with a lock state change', async () => {
		const testNote = await Note.save({ title: 'Plain', body: 'plain text', parent_id: folderId });

		mockUnlockedSession();

		// The enable flow flips is_locked in the state note; the diff then only contains
		// is_locked, and the save must still write the encrypted body with it.
		const flippedNote = { ...testNote, is_locked: 1, isDecrypted: true };
		const comp = makeComp(testNote, { note: flippedNote });
		await shared.saveNoteButton_press(comp, comp.state, null, null);

		const savedNote = await Note.load(testNote.id);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.body).toBe('enc(plain text)');
		// The state must keep the plaintext so later diffs and the editor keep working.
		expect(comp.state.note.body).toBe('plain text');
		expect(comp.state.lastSavedNote.body).toBe('plain text');
	});

	it('should keep the body encrypted when saving a single body property of a locked note', async () => {
		const testNote = await Note.save({ title: 'Locked', body: 'enc(- [ ] task)', is_locked: 1, parent_id: folderId });

		mockUnlockedSession();

		// State as after a gated load: plaintext body, decrypted-state marker, captured key.
		const loadedNote = { ...testNote, body: '- [ ] task', isDecrypted: true };
		const comp = makeComp(loadedNote, { noteLockKey: { id: 'key-id', plainText: 'key' } });

		await shared.saveOneProperty(comp, 'body', '- [x] task');

		const savedNote = await Note.load(testNote.id);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.body).toBe('enc(- [x] task)');
		expect(comp.state.note.body).toBe('- [x] task');
	});

	it('should keep the decrypted state when a property save recreates a deleted note', async () => {
		const testNote = await Note.save({ title: 'Locked', body: 'enc(- [ ] task)', is_locked: 1, parent_id: folderId });

		mockUnlockedSession();

		const loadedNote = { ...testNote, body: '- [ ] task', isDecrypted: true };
		const comp = makeComp(loadedNote, { noteLockKey: { id: 'key-id', plainText: 'key' } });
		// e.g. deleted from another client while the note was open.
		await Note.batchDelete([testNote.id]);

		const saveSpy = jest.spyOn(Note, 'save');
		await shared.saveOneProperty(comp, 'body', '- [x] task');

		const newId = comp.state.note.id;
		expect(newId).not.toBe(testNote.id);
		const savedNote = await Note.load(newId);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.body).toBe('enc(- [x] task)');
		expectGatedLockedSaves(saveSpy);
	});

	it('should not revert a lock state change that happens while a save is in flight', async () => {
		// Reloaded so the state note carries all columns, like after reloadNote.
		const testNote = await Note.load((await Note.save({ title: 'Plain', body: 'plain text', parent_id: folderId })).id);

		mockUnlockedSession();

		const comp = makeComp(testNote);

		let saveStarted: ()=> void;
		const saveStartedPromise = new Promise<void>(resolve => { saveStarted = resolve; });
		let finishSave: ()=> void;
		const finishSavePromise = new Promise<void>(resolve => { finishSave = resolve; });
		const originalSave = Note.save.bind(Note);
		jest.spyOn(Note, 'save').mockImplementationOnce(async (note, options) => {
			saveStarted();
			await finishSavePromise;
			return originalSave(note, options);
		});

		const savePromise = shared.saveNoteButton_press(comp, { ...comp.state, note: { ...comp.state.note, body: 'edited text' } }, null, null);
		await saveStartedPromise;
		// Encryption enabled from the menu while the body save is running.
		const flippedNote = { ...comp.state.note, is_locked: 1, isDecrypted: true };
		comp.state.note = flippedNote;
		finishSave();
		await savePromise;

		expect(comp.state.note.is_locked).toBe(1);
		expect((comp.state.note as Record<string, unknown>).isDecrypted).toBe(true);

		// The scheduled lock save runs against that state.
		await shared.saveNoteButton_press(comp, comp.state, null, null);
		const savedNote = await Note.load(testNote.id);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.body).toMatch(/^enc\(/);
	});

	it('should keep the decrypted state when the note is recreated after being deleted while editing', async () => {
		const testNote = await Note.save({ title: 'Plain', body: 'plain text', parent_id: folderId });

		mockUnlockedSession();

		// The provisional-note cleanup can delete the note while the enable flow's save is
		// still queued, e.g. new note -> enable encryption -> unlock via the Config screen.
		const flippedNote = { ...testNote, is_locked: 1, isDecrypted: true };
		const comp = makeComp(testNote, { note: flippedNote });
		await Note.batchDelete([testNote.id]);

		const saveSpy = jest.spyOn(Note, 'save');
		await shared.saveNoteButton_press(comp, comp.state, null, null);

		const newId = comp.state.note.id;
		expect(newId).not.toBe(testNote.id);
		const savedNote = await Note.load(newId);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.body).toBe('enc(plain text)');
		expect(comp.state.note.body).toBe('plain text');
		expect((comp.state.note as Record<string, unknown>).isDecrypted).toBe(true);
		expectGatedLockedSaves(saveSpy);
	});

	it('should persist the lock state for a pending save that does not touch the body', async () => {
		const testNote = await Note.load((await Note.save({ title: 'Plain', body: 'plain text', parent_id: folderId })).id);

		mockUnlockedSession();

		const comp = makeComp(testNote);
		// A title-only save scheduled before the flip: its field diff has no is_locked or body,
		// so only the lastSavedNote comparison can pull the lock transition into the save.
		const snapshotState = { ...comp.state, note: { ...comp.state.note, title: 'edited title' } };
		const flippedNote = { ...comp.state.note, is_locked: 1, isDecrypted: true };
		comp.state.note = flippedNote;
		await shared.saveNoteButton_press(comp, snapshotState, null, null);

		const savedNote = await Note.load(testNote.id);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.title).toBe('edited title');
		expect(savedNote.body).toBe('enc(plain text)');
	});

	it('should not report a note as modified once its save has completed', async () => {
		const testNote = await Note.load((await Note.save({ title: 'Plain', body: 'plain text', parent_id: folderId })).id);

		// The save stamps the decrypted-state marker onto only one of the state notes; counting
		// that as a modification hides a locked note's lock panel, which exposes the ciphertext.
		const comp = makeComp(testNote, { note: { ...testNote, body: 'edited text' } });
		await shared.saveNoteButton_press(comp, comp.state, null, null);

		expect(shared.isModified(comp)).toBe(false);
	});

	it('should save with the latest lock state when it changed after scheduling', async () => {
		const testNote = await Note.save({ title: 'Plain', body: 'plain text', parent_id: folderId });

		mockUnlockedSession();

		const comp = makeComp(testNote);
		// Snapshot taken before the flip, e.g. a pending body save scheduled before encryption
		// was enabled from the menu.
		const snapshotState = { ...comp.state, note: { ...comp.state.note, body: 'edited text' } };
		const flippedNote = { ...comp.state.note, is_locked: 1, isDecrypted: true };
		comp.state.note = flippedNote;
		await shared.saveNoteButton_press(comp, snapshotState, null, null);

		const savedNote = await Note.load(testNote.id);
		expect(savedNote.is_locked).toBe(1);
		expect(savedNote.body).toBe('enc(edited text)');
	});

	it('should reload an encrypted note after decrypting it', async () => {
		jest.spyOn(shared, 'attachedResources').mockResolvedValue({});
		const encryptedNote = { id: 'note-id', encryption_cipher_text: 'cipher text', deleted_time: 0 };
		const decryptedNote = { ...encryptedNote, encryption_cipher_text: '', title: 'Title', body: 'Body' };
		const decryptStarted = deferred<void>();
		const decryption = deferred<typeof decryptedNote>();
		jest.spyOn(Note, 'load').mockResolvedValue(encryptedNote as never);
		jest.spyOn(Note, 'decrypt').mockImplementation(() => {
			decryptStarted.resolve();
			return decryption.promise as never;
		});
		const component = newComponent();

		const reloadPromise = shared.reloadNote(component);
		await decryptStarted.promise;
		expect(component.setState).not.toHaveBeenCalled();

		decryption.resolve(decryptedNote);
		await reloadPromise;

		expect(component.setState).toHaveBeenCalledWith(expect.objectContaining({ note: decryptedNote }));
	});

	it.each([
		['the master key is not loaded', Object.assign(new Error('Master key is not loaded'), { code: 'masterKeyNotLoaded' })],
		['decryption otherwise fails', new Error('Invalid ciphertext')],
	])('should use the empty-note branch when %s', async (_description, error) => {
		jest.spyOn(shared, 'attachedResources').mockResolvedValue({});
		const encryptedNote = { id: 'note-id', encryption_cipher_text: 'cipher text' };
		jest.spyOn(Note, 'load').mockResolvedValue(encryptedNote as never);
		jest.spyOn(Note, 'decrypt').mockRejectedValue(error);
		const component = newComponent();

		const result = await shared.reloadNote(component);

		expect(result).toBeNull();
		expect(component.setState).toHaveBeenCalledWith(expect.objectContaining({ note: {}, isLoading: true }));
	});
});
