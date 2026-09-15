import { autoMerge, MergedSection } from './diffNotes';

export interface NoteVersion {
	title: string;
	body: string;
}

// A title is a conflict only when the both sides changed it differently
export const mergeTitle = (base: string, local: string, remote: string) => {
	if (local === remote) return { merged: local, conflict: false };
	if (base === local) return { merged: remote, conflict: false };
	if (base === remote) return { merged: local, conflict: false };
	return { merged: '', conflict: true };
};

// Only conflict sections differ between the two sides; everything else is shared between them
const buildBody = (sections: MergedSection[], conflictSide: 'localText' | 'remoteText'): string => {
	return sections.map(section => section.type === 'conflict' ? (section[conflictSide] ?? '') : section.text).join('\n');
};

export interface PartialMergeResult {
	fullyMerged: boolean;
	// Non-conflicting changes are merged, and any remaining conflicts keep the user's version
	resolvedLocal: NoteVersion;
	// Same, but remaining conflicts kept as the incoming side
	resolvedCurrent: NoteVersion;
}

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
