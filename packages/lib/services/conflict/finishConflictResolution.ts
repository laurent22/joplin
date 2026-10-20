import Note from '../../models/Note';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('finishConflictResolution');

export enum FinishStatus {
	Ok = 'ok',
	Unavailable = 'unavailable',
	OriginalChanged = 'originalChanged',
	CannotWrite = 'cannotWrite',
}

export interface FinishResult {
	status: FinishStatus;
	originalId: string;
	reason?: string;
}

interface Options {
	title: string;
	body: string;
	remoteUpdatedTime: number;
}

// Saves to the original note so it keeps its id and sync data. The conflict
// note is deleted only after the save succeeds, so the user's work is safe.
export default async (conflictNoteId: string, options: Options): Promise<FinishResult> => {
	const note = await Note.load(conflictNoteId);
	if (!note || !note.is_conflict || !note.conflict_original_id) {
		return { status: FinishStatus.Unavailable, originalId: '' };
	}

	const original = await Note.load(note.conflict_original_id);
	if (!original) return { status: FinishStatus.Unavailable, originalId: '' };

	if (original.encryption_applied) {
		return { status: FinishStatus.CannotWrite, originalId: original.id, reason: 'encrypted' };
	}
	if (original.is_locked) {
		return { status: FinishStatus.CannotWrite, originalId: original.id, reason: 'locked' };
	}
	if (original.deleted_time) {
		return { status: FinishStatus.CannotWrite, originalId: original.id, reason: 'trashed' };
	}

	// Based on what the merge used, not when the conflict was created. A previous
	// sync is already part of that merge.
	if (original.updated_time > options.remoteUpdatedTime) {
		return { status: FinishStatus.OriginalChanged, originalId: original.id };
	}

	try {
		await Note.save({
			id: original.id,
			title: options.title,
			body: options.body,
		});
	} catch (error) {
		// A read-only or shared note throws here
		logger.warn('Could not save the resolved note', original.id, error);
		return { status: FinishStatus.CannotWrite, originalId: original.id, reason: error.message };
	}

	// Permanently, not to the trash: it only ever existed on this device
	try {
		await Note.delete(conflictNoteId, { sourceDescription: 'finishConflictResolution' });
	} catch (error) {
		logger.warn('Resolved note was saved but the conflict note could not be deleted', conflictNoteId, error);
	}

	return { status: FinishStatus.Ok, originalId: original.id };
};
