import Note from '../../models/Note';
import ConflictNoteState from '../../models/ConflictNoteState';
import { autoMerge, MergedSection } from './diffNotes';
import isConflictResolutionEnabled from './isConflictResolutionEnabled';

export enum ConflictDataStatus {
	Ok = 'ok',
	Unavailable = 'unavailable',
}

export interface ConflictData {
	status: ConflictDataStatus;
	sections: MergedSection[];
	mergedText: string;
	remoteUpdatedTime: number;
	localTitle: string;
	remoteTitle: string;
	titleConflict: boolean;
}

const unavailable = (): ConflictData => {
	return {
		status: ConflictDataStatus.Unavailable,
		sections: [],
		mergedText: '',
		remoteUpdatedTime: 0,
		localTitle: '',
		remoteTitle: '',
		titleConflict: false,
	};
};

// Sections are recomputed on each call because they were never stored.
export default async (noteId: string): Promise<ConflictData> => {
	if (!isConflictResolutionEnabled()) return unavailable();

	const note = await Note.load(noteId);
	if (!note) return unavailable();

	// No readable body yet - decryption re-saves the note, recomputing the merge
	if (note.encryption_applied || note.is_locked) return unavailable();

	const state = await ConflictNoteState.byNoteId(noteId);
	if (!state) return unavailable();

	// Read the current text instead of an old copy, so the merge uses what still exists.
	const original = note.conflict_original_id ? await Note.load(note.conflict_original_id) : null;
	if (!original || original.encryption_applied || original.is_locked) return unavailable();

	const localBody = note.body ?? '';
	const remoteBody = original.body ?? '';

	// Two-way on purpose: auto-merge already handled the safe changes, so only
	// real conflicts remain. Using the base again could merge them silently.
	const merged = autoMerge('', localBody, remoteBody);

	const localTitle = note.title ?? '';
	const remoteTitle = original.title ?? '';

	return {
		status: ConflictDataStatus.Ok,
		sections: merged.sections,
		mergedText: merged.mergedText,
		remoteUpdatedTime: original.updated_time,
		localTitle,
		remoteTitle,
		titleConflict: localTitle !== remoteTitle,
	};
};
