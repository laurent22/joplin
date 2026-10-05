import Logger from '@joplin/utils/Logger';
import { Dispatch } from 'redux';
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
// onStarted runs once both passwords are accepted.
export const migrateLockedNotes = async (localPassword: string, targetPassword: string, onStarted: ()=> void = null) => {
	if (!isNoteLockEnabled()) throw new Error('Note lock is not enabled');
	const conflict = noteLockKeyConflict();
	if (!conflict) throw new Error('No note lock key conflict to migrate');
	const encryptionService = EncryptionService.instance();
	const localKey = await NoteLockKey.instance().decrypt(localPassword);
	const targetKey: DecryptedNoteLockKey = {
		id: conflict.noteLockKey.id,
		plainText: await encryptionService.decryptMasterKeyContent(conflict.noteLockKey, targetPassword),
	};
	onStarted?.();

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

// The session is locked when the target key is parked and cannot be unlocked until it is adopted, so no locked note is
// saved with the local key once a run starts, and after a run with no failures none is left under it.
export const finishNoteLockKeyMigration = () => {
	adoptNoteLockKeyConflict();
	NoteLockSession.instance().lock();
};

// Runs in the background once both passwords are accepted, so the app stays usable, and reports its progress for the
// banners. A run with failures keeps the target key parked for a retry or a skip.
export const startNoteLockKeyMigration = async (localPassword: string, targetPassword: string, dispatch: Dispatch, onStarted: ()=> void) => {
	const result = await migrateLockedNotes(localPassword, targetPassword, () => {
		onStarted();
		dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: true, failed: 0 } });
	});
	if (!result.failed) finishNoteLockKeyMigration();
	dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: false, failed: result.failed } });
};
