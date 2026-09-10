import { NoteEntity } from '../database/types';
import NoteLockService from './NoteLockService';
import type { DecryptedNoteLockKey } from './NoteLockKey';

// The marker a gated load stamps on a note. Not a database column, so it cannot live on the
// generated NoteEntity type.
export type NoteLockNoteEntity = NoteEntity & { isDecrypted?: boolean };

export default class NoteLockNote {

	public static isLocked(note: NoteEntity): boolean {
		if (!note) return false;
		return !!note.is_locked;
	}

	public static isLocking(note: NoteEntity, oldNote: NoteEntity): boolean {
		if (!oldNote) return false;
		return this.isLocked(note) && !oldNote.is_locked;
	}

	public static async decryptBody(note: NoteEntity, key: DecryptedNoteLockKey = null): Promise<NoteLockNoteEntity> {
		if (!note) throw new Error('Gated note lock load is missing note');
		if (note.is_locked === undefined) throw new Error('Gated note lock load is missing lock state');
		const isLocked = this.isLocked(note);
		const result = { ...note, isDecrypted: isLocked };
		if (isLocked) {
			// A missing body here means the gated load did not request enough fields, so pass an empty string and let decryption fail explicitly.
			result.body = await NoteLockService.withDecryptedKey(scoped => scoped.decryptString(note.body ?? ''), key);
		}
		return result;
	}

	public static async prepareForSave(note: NoteLockNoteEntity, linkedItemIds: (body: string)=> string[], serializeResourceIds: (resourceIds: string[])=> string, isNew: boolean, key: DecryptedNoteLockKey = null) {
		if (!note) throw new Error('Gated note lock save is missing note');
		// Gated saves do not support partial note objects, so they must be based on a loaded note.
		if (note.is_locked === undefined && !isNew) throw new Error('Gated note lock save is missing lock state');
		if (!('body' in note)) throw new Error('Gated note lock save is missing body');
		const isLocked = this.isLocked(note);
		// A body that never went through a gated decrypt would be encrypted a second time here.
		if (isLocked && !isNew && !note.isDecrypted) throw new Error('Gated note lock save is missing decrypted state');
		if (!isLocked) note.extracted_resource_ids = '';

		const plainTextBody = note.body ?? '';
		if (isLocked) {
			note.extracted_resource_ids = serializeResourceIds(linkedItemIds(plainTextBody));
			note.body = await NoteLockService.withDecryptedKey(scoped => scoped.encryptString(plainTextBody), key);
		}
	}
}
