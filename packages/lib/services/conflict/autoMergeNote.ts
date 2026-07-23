import { autoMerge, MergedSection } from './diffNotes';

export interface NoteVersion {
	title: string;
	body: string;
}

// Merges the title if only one side changed it compared to the base.
// If both sides changed it, it becomes a conflict. Without a base version,
// we cannot know which side made the change, so different titles are treated
// as conflicts unless one side matches the empty base.
export const mergeTitle = (base: string, local: string, remote: string) => {
	if (local === remote) return { merged: local, conflict: false };
	if (base === local) return { merged: remote, conflict: false };
	if (base === remote) return { merged: local, conflict: false };
	return { merged: '', conflict: true };
};

// Rebuilds the note body from the merge sections by choosing the given side
// for any real conflicts. Auto-merged and unchanged sections are already the
// same on both sides, so only the conflict sections can make the local and
// remote results different.
const buildBody = (sections: MergedSection[], conflictSide: 'localText' | 'remoteText'): string => {
	return sections.map(section => section.type === 'conflict' ? (section[conflictSide] ?? '') : section.text).join('\n');
};

export interface PartialMergeResult {
	// True once every section merged cleanly - no conflict note is needed.
	fullyMerged: boolean;
	// The note that will be saved as the conflict note, if one is still needed.
	// It includes all non-conflicting changes from both sides, while any remaining
	// conflicts keep the user's own version.
	resolvedLocal: NoteVersion;
	// The note that will replace the original and become the new current version.
	// It includes all non-conflicting changes, while any remaining conflicts keep
	// the incoming version.
	resolvedCurrent: NoteVersion;
}

// Applies all non-overlapping changes from both sides, including the title
// and body, even if some changes cannot be merged. Real conflicts are kept
// unchanged on each side, so the two returned versions are the same except
// where a real conflict still exists.
export default (base: NoteVersion, local: NoteVersion, remote: NoteVersion): PartialMergeResult => {
	const title = mergeTitle(base.title ?? '', local.title ?? '', remote.title ?? '');

	const localBody = local.body ?? '';
	const remoteBody = remote.body ?? '';

	if (localBody === remoteBody && !title.conflict) {
		return { fullyMerged: true, resolvedLocal: { title: title.merged, body: localBody }, resolvedCurrent: { title: title.merged, body: localBody } };
	}

	const merged = autoMerge(base.body ?? '', localBody, remoteBody);
	const bodyFullyMerged = !merged.sections.some(s => s.type === 'conflict');

	return {
		fullyMerged: bodyFullyMerged && !title.conflict,
		resolvedLocal: {
			title: title.conflict ? (local.title ?? '') : title.merged,
			body: bodyFullyMerged ? merged.mergedText : buildBody(merged.sections, 'localText'),
		},
		resolvedCurrent: {
			title: title.conflict ? (remote.title ?? '') : title.merged,
			body: bodyFullyMerged ? merged.mergedText : buildBody(merged.sections, 'remoteText'),
		},
	};
};
