import Note from '../../models/Note';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('keepConflictCopy');

export enum KeepStatus {
	Ok = 'ok',
	Unavailable = 'unavailable',
	CannotWrite = 'cannotWrite',
}

export interface KeepResult {
	status: KeepStatus;
	noteId: string;
	title?: string;
	nextConflictId?: string;
	reason?: string;
}

const suffix = 'conflicted copy';

// Escape % and _ so they don't affect the search
const escapeForLike = (text: string) => text.replace(/[\\%_]/g, match => `\\${match}`);

// Uses "Title (conflicted copy)", then "Title (conflicted copy 2)", etc.
// The highest number is used, so titles are never reused
export const titleForCopy = (originalTitle: string, taken: string[]) => {
	const first = `${originalTitle} (${suffix})`;
	if (!taken.includes(first)) return first;

	// Compared as plain strings, so a title containing regex characters is safe
	const prefix = `${originalTitle} (${suffix} `;
	let highest = 1;
	for (const title of taken) {
		if (!title.startsWith(prefix) || !title.endsWith(')')) continue;
		const number = Number(title.slice(prefix.length, -1));
		if (Number.isInteger(number)) highest = Math.max(highest, number);
	}

	return `${originalTitle} (${suffix} ${highest + 1})`;
};

// Keeps the conflict note without changing the original
export default async (conflictNoteId: string): Promise<KeepResult> => {
	const note = await Note.load(conflictNoteId);
	if (!note || !note.is_conflict || !note.conflict_original_id) {
		return { status: KeepStatus.Unavailable, noteId: '' };
	}

	const original = await Note.load(note.conflict_original_id);
	if (!original) return { status: KeepStatus.Unavailable, noteId: '' };

	const baseTitle = note.title ?? '';
	const taken = await Note.titlesLike(`${escapeForLike(baseTitle)} (${suffix}%`);
	const title = titleForCopy(baseTitle, taken);

	try {
		await Note.save({
			id: note.id,
			title,
			parent_id: original.parent_id,
			is_conflict: 0,
			conflict_original_id: '',
		});
	} catch (error) {
		logger.warn('Could not keep the conflict note', conflictNoteId, error);
		return { status: KeepStatus.CannotWrite, noteId: conflictNoteId, reason: error.message };
	}

	// opens next conflict as it's no longer a conflict
	const remaining = await Note.conflictedNotes();
	const nextConflictId = remaining.length ? remaining[0].id : '';

	return { status: KeepStatus.Ok, noteId: note.id, title, nextConflictId };
};
