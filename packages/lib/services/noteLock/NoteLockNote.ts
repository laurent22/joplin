import { NoteEntity } from '../database/types';
import isItemId from '../../models/utils/isItemId';
import NoteLockService from './NoteLockService';

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
		if (this.isLocked(note)) {
			// A missing body here means the gated load did not request enough fields, so pass an empty string and let decryption fail explicitly.
			return {
				...note,
				body: await NoteLockService.instance().decryptString(note.body ?? ''),
			};
		}
		return note;
	}

	public static async prepareForSave(note: NoteEntity, linkedItemIds: (body: string)=> string[], isNew: boolean) {
		if (!note) throw new Error('Gated note lock save is missing note');
		// Gated saves for existing notes should be based on a loaded note, so missing lock state is a logic error.
		if (note.is_locked === undefined && !isNew) throw new Error('Gated note lock save is missing lock state');
		const isLocked = this.isLocked(note);
		if (!isLocked) note.extracted_resource_ids = '';

		const plainTextBody = note.body ?? '';
		if (isLocked) {
			note.extracted_resource_ids = linkedItemIds(plainTextBody).filter(id => !!isItemId(id)).join(',');
			note.body = await NoteLockService.instance().encryptString(plainTextBody);
		}
	}
}
