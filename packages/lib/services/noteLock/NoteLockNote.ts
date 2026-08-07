import { NoteEntity } from '../database/types';
import NoteLockService from './NoteLockService';
import type { DecryptedNoteLockKey } from './NoteLockKey';

export default class NoteLockNote {

	public static isLocked(note: NoteEntity): boolean {
		if (!note) return false;
		return !!note.is_locked;
	}

	public static isLocking(note: NoteEntity, oldNote: NoteEntity): boolean {
		if (!oldNote) return false;
		return this.isLocked(note) && !oldNote.is_locked;
	}

	public static async decryptBody(note: NoteEntity): Promise<NoteEntity> {
		if (!note) throw new Error('Gated note lock load is missing note');
		if (note.is_locked === undefined) throw new Error('Gated note lock load is missing lock state');
		const isLocked = this.isLocked(note);
		// The marker means the note was loaded with the gate, locked or not.
		const result = { ...note, isDecrypted: true };
		if (isLocked) {
			// A missing body here means the gated load did not request enough fields, so pass an empty string and let decryption fail explicitly.
			result.body = await NoteLockService.instance().decryptString(note.body ?? '');
		}
		return result;
	}

	public static async prepareForSave(note: NoteEntity, linkedItemIds: (body: string)=> string[], serializeResourceIds: (resourceIds: string[])=> string, isNew: boolean, useNoteLock: boolean, key: DecryptedNoteLockKey = null) {
		if (!note) throw new Error('Gated note lock save is missing note');
		if (!('body' in note)) throw new Error('Gated note lock save is missing body');
		const isLocked = this.isLocked(note);
		// The marker proves the data came from a gated load, so a cipher body is never encrypted
		// a second time and a missed gated load fails during development, locked note or not.
		if (useNoteLock && !isNew && !(note as Record<string, unknown>).isDecrypted) throw new Error('Gated note lock save is missing decrypted state');
		if (!isLocked) note.extracted_resource_ids = '';

		const plainTextBody = note.body ?? '';
		if (isLocked) {
			note.extracted_resource_ids = serializeResourceIds(linkedItemIds(plainTextBody));
			note.body = await NoteLockService.withDecryptedKey(scoped => scoped.encryptString(plainTextBody), key);
		}
	}
}
