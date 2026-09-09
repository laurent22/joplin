import { revisionService, setupDatabaseAndSynchronizer, switchClient, encryptionService, afterAllCleanUp } from '../testing/test-utils';
import Setting from '../models/Setting';
import Note from '../models/Note';
import Revision from '../models/Revision';
import BaseModel from '../BaseModel';
import EncryptionService from './e2ee/EncryptionService';
import NoteLockKey from './noteLock/NoteLockKey';
import NoteLockService from './noteLock/NoteLockService';
import NoteLockSession from './noteLock/NoteLockSession';

// setNoteLockState only emits events now, so lock transitions are applied here the way the
// note screen does, with a direct gated save.
const enableNoteLock = async (noteId: string) => {
	const toSave = { ...await Note.load(noteId), is_locked: 1 };
	(toSave as Record<string, unknown>).isDecrypted = true;
	await Note.save(toSave, { useNoteLock: true });
};

const disableNoteLock = async (noteId: string) => {
	const note = await Note.load(noteId, { useNoteLock: true });
	await Note.save({ ...note, is_locked: 0 }, { useNoteLock: true });
};

const setUpUnlockedSession = async (password = '123456') => {
	await NoteLockKey.instance().create(password);
	await NoteLockSession.instance().unlock(password);
};

// Two plaintext revisions, then the note is locked and a standalone revision is collected.
const createLockedNoteWithHistory = async () => {
	await setUpUnlockedSession();
	const note = await Note.save({ title: 'note', body: 'secret v1' });
	await Note.save({ id: note.id, body: 'secret v2' });
	await revisionService().collectRevisions();
	await enableNoteLock(note.id);
	await revisionService().collectRevisions();
	return note;
};

describe('RevisionService.noteLock', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		Setting.setValue('featureFlag.noteLock', true);
		Setting.setValue('revisionService.intervalBetweenRevisions', 0);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should create standalone revisions while the note is locked', async () => {
		const note = await createLockedNoteWithHistory();

		const decrypted = await Note.load(note.id, { useNoteLock: true });
		await Note.save({ ...decrypted, body: 'secret v3' }, { useNoteLock: true });
		await revisionService().collectRevisions();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, note.id);
		expect(revisions.length).toBe(2);
		for (const rev of revisions) {
			expect(rev.is_locked).toBe(1);
			expect(rev.parent_id).toBe('');
			expect(rev.body_diff).not.toContain('secret');
		}

		const revNote = await revisionService().revisionNote(revisions, revisions.length - 1);
		expect(revNote.is_locked).toBe(1);
		expect(revNote.body).not.toContain('secret');
	});

	it('should create a locked standalone revision for the old-note copy too', async () => {
		Setting.setValue('revisionService.oldNoteInterval', 0);
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret v1' });
		await enableNoteLock(note.id);
		await revisionService().collectRevisions();

		const decrypted = await Note.load(note.id, { useNoteLock: true });
		await Note.save({ ...decrypted, body: 'secret v2' }, { useNoteLock: true });
		await revisionService().collectRevisions();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, note.id);
		expect(revisions.length).toBeGreaterThanOrEqual(2);
		for (const rev of revisions) {
			expect(rev.is_locked).toBe(1);
			expect(rev.parent_id).toBe('');
			expect(rev.body_diff).not.toContain('secret');
		}
	});

	it('should start a fresh revision chain for the first unencrypted revision after disabling', async () => {
		const note = await createLockedNoteWithHistory();

		await disableNoteLock(note.id);
		await revisionService().collectRevisions();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, note.id);
		expect(revisions.length).toBe(2);
		expect(revisions[0].is_locked).toBe(1);
		expect(revisions[1].is_locked).toBe(0);
		expect(revisions[1].parent_id).toBe('');

		const revNote = await revisionService().revisionNote(revisions, 1);
		expect(revNote.body).toBe('secret v2');
	});

	it('should restore an encrypted revision as a locked note', async () => {
		const note = await createLockedNoteWithHistory();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, note.id);
		const revNote = await revisionService().revisionNote(revisions, revisions.length - 1);
		const restored = await revisionService().importRevisionNote(revNote);

		const reloaded = await Note.load(restored.id);
		expect(reloaded.is_locked).toBe(1);
		expect(reloaded.body).not.toContain('secret');
		expect((await Note.load(restored.id, { useNoteLock: true })).body).toBe('secret v2');
	});

});
