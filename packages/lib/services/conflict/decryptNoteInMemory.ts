import BaseItem from '../../models/BaseItem';
import Note from '../../models/Note';
import { NoteEntity } from '../database/types';
import Logger from '@joplin/utils/Logger';
import isAutoMergeEnabled from './isAutoMergeEnabled';

const logger = Logger.create('decryptNoteInMemory');

// Returns a decrypted copy of the note, or null if it can't be decrypted, Unlike the
// BaseItem.decrypt() nothing is saved, so the remote can't overwrite the local note.
export default async (note: NoteEntity): Promise<NoteEntity|null> => {
	if (!note.encryption_cipher_text) return note;

	// Disabling auto-merge must also stop this decryption, so a sync failing on memory can complete
	if (!isAutoMergeEnabled()) return null;

	try {
		const plainText = await BaseItem.encryptionService().decryptString(note.encryption_cipher_text);
		const plainNote: NoteEntity = await Note.unserialize(plainText);

		return {
			...plainNote,
			updated_time: note.updated_time,
			encryption_cipher_text: '',
			encryption_applied: 0,
		};
	} catch (error) {
		logger.info(`Could not decrypt note ${note.id} for auto-merge, falling back to a conflict note:`, error.message);
		return null;
	}
};
