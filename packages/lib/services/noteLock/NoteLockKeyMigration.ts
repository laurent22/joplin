import Logger from '@joplin/utils/Logger';
import Note from '../../models/Note';
import EncryptionService from '../e2ee/EncryptionService';
import { adoptNoteLockKeyConflict, noteLockKeyConflict } from '../synchronizer/syncInfoUtils';
import isNoteLockEnabled from './isNoteLockEnabled';
import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockSession from './NoteLockSession';

const logger = Logger.create('NoteLockKeyMigration');

export interface NoteLockKeyMigrationResult {
	migrated: number;
	// Locked with a key that is neither the local nor the sync target one, so nothing here can read them.
	skipped: number;
	failed: number;
}

// Re-encrypts the notes locked with the local key to the parked target key; notes already under it are left
// alone, so a retry only touches the rest. The local key stays until finish, so an interrupted run loses nothing.
export const migrateLockedNotes = async (localPassword: string, targetPassword: string) => {
	if (!isNoteLockEnabled()) throw new Error('Note lock is not enabled');
	const conflict = noteLockKeyConflict();
	if (!conflict) throw new Error('No note lock key conflict to migrate');
	const encryptionService = EncryptionService.instance();
	const localKey = await NoteLockKey.instance().decrypt(localPassword);
	const targetKey: DecryptedNoteLockKey = {
		id: conflict.noteLockKey.id,
		plainText: await encryptionService.decryptMasterKeyContent(conflict.noteLockKey, targetPassword),
	};

	const result: NoteLockKeyMigrationResult = { migrated: 0, skipped: 0, failed: 0 };
	for (const noteId of await Note.lockedNoteIds()) {
		try {
			const { body } = await Note.load(noteId, { fields: ['id', 'body'] });
			const header = await encryptionService.decodeHeaderString(body);
			if (header.masterKeyId === targetKey.id) continue;
			if (header.masterKeyId !== localKey.id) {
				result.skipped++;
				continue;
			}
			const note = await Note.load(noteId, { useNoteLock: true, noteLockKey: localKey });
			await Note.save(note, { useNoteLock: true, noteLockKey: targetKey });
			result.migrated++;
		} catch (error) {
			logger.warn(`Could not migrate note ${noteId}:`, error);
			result.failed++;
		}
	}
	return result;
};

const countNotesUnderKey = async (keyId: string) => {
	const encryptionService = EncryptionService.instance();
	let count = 0;
	for (const noteId of await Note.lockedNoteIds()) {
		const { body } = await Note.load(noteId, { fields: ['id', 'body'] });
		try {
			if ((await encryptionService.decodeHeaderString(body)).masterKeyId === keyId) count++;
		} catch (error) {
			logger.warn(`Could not read the key of note ${noteId}:`, error);
		}
	}
	return count;
};

// Adopts the target key and lineage, unless a note is still locked with the local key (an editor can re-save one
// after the migration passed it): then nothing is adopted and their count comes back, so the UI can offer a retry.
export const finishNoteLockKeyMigration = async (acceptLoss = false) => {
	if (!acceptLoss) {
		const remaining = await countNotesUnderKey(NoteLockKey.instance().load()?.id);
		if (remaining) return remaining;
	}
	adoptNoteLockKeyConflict();
	NoteLockSession.instance().lock();
	return 0;
};
