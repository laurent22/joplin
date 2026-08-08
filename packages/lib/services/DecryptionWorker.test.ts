import { setupDatabaseAndSynchronizer, switchClient, decryptionWorker, encryptionService, loadEncryptionMasterKey, synchronizerStart } from '../testing/test-utils';
import { setEncryptionEnabled } from './synchronizer/syncInfoUtils';
import Note from '../models/Note';
import Folder from '../models/Folder';
import MasterKey from '../models/MasterKey';

describe('services/DecryptionWorker', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should not return null when a call to .start is cancelled', async () => {
		const worker = decryptionWorker();

		// Both calls should return a valid DecryptionResult, even if the
		// queue skips one task due to concurrency.
		const results = await Promise.all([
			worker.start(),
			worker.start(),
		]);

		for (const result of results) {
			expect(result === null).toBe(false);
			expect(result === undefined).toBe(false);
			expect(result).toHaveProperty('error');
		}
	});

	it('should decrypt a single item on demand, without decrypting the rest of the queue', async () => {
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		const folder = await Folder.save({ title: 'folder' });
		const notes = [];
		for (let i = 0; i < 5; i++) {
			notes.push(await Note.save({ title: `note${i}`, body: `body${i}`, parent_id: folder.id }));
		}
		await synchronizerStart();

		// On the second client the notes are received encrypted.
		await switchClient(2);
		await synchronizerStart();

		for (const note of notes) {
			expect((await Note.load(note.id)).encryption_applied).toBe(1);
		}

		await encryptionService().loadMasterKey((await MasterKey.all())[0], '123456', true);

		const targetNote = notes[2];
		const result = await decryptionWorker().decryptItem(targetNote.id);
		expect(result).toBe(true);

		const decryptedNote = await Note.load(targetNote.id);
		expect(decryptedNote.encryption_applied).toBe(0);
		expect(decryptedNote.title).toBe('note2');
		expect(decryptedNote.body).toBe('body2');

		// The other notes remain encrypted - only the requested one has been decrypted.
		for (const note of notes) {
			if (note.id === targetNote.id) continue;
			expect((await Note.load(note.id)).encryption_applied).toBe(1);
		}
	});

	it('should return false when the item is not encrypted', async () => {
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'body', parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();

		await encryptionService().loadMasterKey((await MasterKey.all())[0], '123456', true);

		expect(await decryptionWorker().decryptItem(note.id)).toBe(true);
		// Once the note has been decrypted, calling decryptItem again returns false.
		expect(await decryptionWorker().decryptItem(note.id)).toBe(false);
	});
});
