import Logger from '@joplin/utils/Logger';
import { Dispatch } from 'redux';
import { _, _n } from '../../locale';
import type { NoteLockMigrationStatus } from '../../reducer';
import Note from '../../models/Note';
import time from '../../time';
import shim, { MessageBoxType } from '../../shim';
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
	// Still encrypted by sync, so their note lock body cannot be read yet. A retry once they are decrypted picks them up.
	awaitingDecryption: number;
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
	const result: NoteLockKeyMigrationResult = { migrated: 0, skipped: 0, failed: 0, awaitingDecryption: 0 };
	// A sync may have replaced the parked key while the passwords were checked. From here the sync leaves it alone.
	if (noteLockKeyConflict()?.noteLockKey.id !== targetKey.id) throw new Error(_('The note lock key on the sync target changed. Please try again.'));
	NoteLockSession.instance().setMigrating(true);
	try {
		onStarted?.();
		for (const noteId of await Note.lockedNoteIds()) {
			try {
				const { body, encryption_applied } = await Note.load(noteId, { fields: ['id', 'body', 'encryption_applied'] });
				if (encryption_applied) {
					result.awaitingDecryption++;
					continue;
				}
				const header = await encryptionService.decodeHeaderString(body, true);
				if (header.masterKeyId === targetKey.id) continue;
				if (header.masterKeyId !== localKey.id) {
					result.skipped++;
					continue;
				}
				const note = await Note.load(noteId, { useNoteLock: true, noteLockKey: localKey });
				// The note keeps its own "updated" date; updated_time still moves so the re-encrypted note syncs.
				await Note.save({ ...note, updated_time: time.unixMs() }, { useNoteLock: true, noteLockKey: targetKey, autoTimestamp: false });
				result.migrated++;
			} catch (error) {
				logger.warn(`Could not migrate note ${noteId}:`, error);
				result.failed++;
			}
			// With the feature turned off the note was not re-encrypted, whether Note.save refused it or saved it ungated.
			if (!isNoteLockEnabled()) throw new Error(_('The note lock key migration was cancelled because the note lock feature was turned off.'));
		}
	} finally {
		NoteLockSession.instance().setMigrating(false);
	}
	return result;
};

// Locked notes stay closed while a run goes, so after a run with no failures no note is left under the local key, apart
// from an editor save that was already queued when the run started.
export const finishNoteLockKeyMigration = () => {
	adoptNoteLockKeyConflict();
	NoteLockSession.instance().lock();
};

export const confirmAndSkipNoteLockKeyMigration = async (dispatch: Dispatch) => {
	if (await shim.showMessageBox(_('Warning: Notes still locked with the current note lock key will become permanently unreadable. Before continuing, it is recommended to first export all notes on this device as a JEX backup, which can be imported again later if the correct password is used. Are you sure you want to continue without migrating the remaining notes?'), { buttons: [_('Yes'), _('No')], type: MessageBoxType.Confirm, cancelId: 1 }) !== 0) return false;
	finishNoteLockKeyMigration();
	dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
	return true;
};

// Runs in the background once both passwords are accepted, so the app stays usable, and reports its progress for the
// banners. A run with failures keeps the target key parked for a retry or a skip.
export const startNoteLockKeyMigration = async (localPassword: string, targetPassword: string, dispatch: Dispatch, onStarted: ()=> void) => {
	let started = false;
	let result: NoteLockKeyMigrationResult;
	try {
		result = await migrateLockedNotes(localPassword, targetPassword, () => {
			started = true;
			onStarted();
			dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: true, failed: 0, skipped: 0, awaitingDecryption: 0 } });
		});
	} catch (error) {
		// Before the start the dialog is still open to show the error, after it the dialog is gone.
		if (!started) throw error;
		dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
		await shim.showErrorDialog(error.message);
		return;
	}
	if (!result.failed && !result.awaitingDecryption) finishNoteLockKeyMigration();
	dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: false, failed: result.failed, skipped: result.skipped, awaitingDecryption: result.awaitingDecryption } });
};

// The notes a run left under the local key, so the banner offers a retry or a skip.
export const notMigratedMessage = (status: NoteLockMigrationStatus) => {
	const parts = [];
	if (status.failed) parts.push(_n('%d locked note could not be migrated.', '%d locked notes could not be migrated.', status.failed, status.failed));
	if (status.awaitingDecryption) parts.push(_n('%d locked note is still waiting to be decrypted and was not migrated yet.', '%d locked notes are still waiting to be decrypted and were not migrated yet.', status.awaitingDecryption, status.awaitingDecryption));
	return withSkippedCount(parts.join(' '), status);
};

// Notes already moved to the parked key need it, so a sync must not drop or replace it.
export const parkedNoteLockKeyInUse = async () => {
	const conflict = noteLockKeyConflict();
	if (!conflict) return false;
	for (const noteId of await Note.lockedNoteIds()) {
		const { body, encryption_applied } = await Note.load(noteId, { fields: ['id', 'body', 'encryption_applied'] });
		if (encryption_applied) continue;
		try {
			if ((await EncryptionService.instance().decodeHeaderString(body, true)).masterKeyId === conflict.noteLockKey.id) return true;
		} catch {
			// A body that is not note lock ciphertext cannot use the parked key.
		}
	}
	return false;
};

export const withSkippedCount = (message: string, status: NoteLockMigrationStatus) => {
	if (!status.skipped) return message;
	return `${message} ${_n('%d locked note was skipped because it is locked with another key.', '%d locked notes were skipped because they are locked with another key.', status.skipped, status.skipped)}`;
};
