import { NoteEntity } from '../database/types';
import NoteLockService from './NoteLockService';

const linkedItemIdPattern = /^[a-f0-9]{32}$/;

export default class NoteLockNote {

	public static isLocked(note: NoteEntity): boolean {
		if (!note) return false;
		return !!note.is_locked;
	}

	public static isLocking(note: NoteEntity, oldNote: NoteEntity): boolean {
		if (!oldNote) return false;
		return this.isLocked(note) && !oldNote.is_locked;
	}

	public static async decryptBody(note: NoteEntity, fields?: string | string[]) {
		if (this.hasField_(fields, 'body') && !this.hasField_(fields, 'is_locked')) throw new Error('Gated note lock load with body is missing lock state');
		if (this.isLocked(note)) {
			// A missing body here means the gated load did not request enough fields, so pass an empty string and let decryption fail explicitly.
			note.body = await NoteLockService.instance().decryptString(note.body ?? '');
		}
	}

	public static async prepareForSave(note: NoteEntity, linkedItemIds: (body: string)=> string[], isNew: boolean) {
		if (!note) return;
		// Gated saves for existing notes should be based on a loaded note, so missing lock state is a logic error.
		if (note.is_locked === undefined && !isNew) throw new Error('Gated note lock save is missing lock state');
		const isLocked = this.isLocked(note);
		if (!isLocked) note.extracted_resource_ids = '';
		if (note.body === undefined) return;

		const plainTextBody = note.body ?? '';
		if (isLocked) {
			note.extracted_resource_ids = linkedItemIds(plainTextBody).filter(id => linkedItemIdPattern.test(id)).join(',');
			note.body = await NoteLockService.instance().encryptString(plainTextBody);
		}
	}

	private static hasField_(fields: string | string[], fieldName: string) {
		if (!fields) return false;
		if (typeof fields === 'string') return fields === fieldName;
		return fields.includes(fieldName);
	}
}
