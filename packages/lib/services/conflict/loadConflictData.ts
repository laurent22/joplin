import Note from '../../models/Note';
import ConflictNoteState from '../../models/ConflictNoteState';
import { autoMerge, MergedSection } from './diffNotes';
import isConflictResolutionEnabled from './isConflictResolutionEnabled';

export enum ConflictDataStatus {
	Ok = 'ok',
	// No three-way data for this note (no state row, or it is still encrypted or
	// locked), so show the read-only conflict view
	Unavailable = 'unavailable',
}

export interface ConflictData {
	status: ConflictDataStatus;
	sections: MergedSection[];
	mergedText: string;
	localTitle: string;
	remoteTitle: string;
	titleConflict: boolean;
}

const unavailable = (): ConflictData => {
	return {
		status: ConflictDataStatus.Unavailable,
		sections: [],
		mergedText: '',
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

	// No readable body to diff against yet - decryption re-saves the note, so the
	// merge can be recomputed then.
	if (note.encryption_applied || note.is_locked) return unavailable();

	const state = await ConflictNoteState.byNoteId(noteId);
	if (!state) return unavailable();

	const localBody = note.body ?? '';
	const remoteBody = state.remote_body ?? '';
	const baseBody = state.base_body ?? '';

	const merged = autoMerge(baseBody, localBody, remoteBody);

	const localTitle = note.title ?? '';
	const remoteTitle = state.remote_title ?? '';

	return {
		status: ConflictDataStatus.Ok,
		sections: merged.sections,
		mergedText: merged.mergedText,
		localTitle,
		remoteTitle,
		titleConflict: localTitle !== remoteTitle,
	};
};
