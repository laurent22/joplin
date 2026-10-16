import Note from '../../models/Note';
import { MergedSection, twoWayDiff } from './diffNotes';
import conflictIsResolvable from './conflictIsResolvable';

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
	const note = await Note.load(noteId);

	const { resolvable, original: remoteNote } = await conflictIsResolvable(note);
	if (!resolvable) return unavailable();

	const localBody = note.body ?? '';
	const remoteBody = remoteNote.body ?? '';

	// Always use two-way diff. The viewer only shows differences, so it does not
	// requires base and all conflicts will appear in same way.
	const merged = twoWayDiff(localBody, remoteBody);

	const localTitle = note.title ?? '';
	const remoteTitle = remoteNote.title ?? '';

	return {
		status: ConflictDataStatus.Ok,
		sections: merged.sections,
		mergedText: merged.mergedText,
		remoteUpdatedTime: remoteNote.updated_time,
		localTitle,
		remoteTitle,
		titleConflict: localTitle !== remoteTitle,
	};
};
