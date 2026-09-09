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

// Re-encrypts every note locked with the local key to the sync target's parked key. Notes already under
// the target key are left alone, so a retry only touches what is still outstanding. The local key stays
// in place until finishNoteLockKeyMigration(), so an interrupted run loses nothing.
export const migrateLockedNotes = async (localPassword: string, targetPassword: string): Promise<NoteLockKeyMigrationResult> => {
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

// Adopts the sync target's key and lineage. Any note still locked with the local key becomes permanently
// unreadable, so the UI warns before calling this, for skip and dismiss alike.
export const finishNoteLockKeyMigration = () => {
	adoptNoteLockKeyConflict();
	NoteLockSession.instance().lock();
};
