import boundedDiff3MergeRegions, { ArrayChange, clearDiffCache, diffLines, diffOptions, DiffOptions, Region, viewerDiffOptions } from './boundedDiff3';

export type MergedSectionType = 'unchanged' | 'auto-merged' | 'conflict';

export interface MergedSection {
	text: string;
	type: MergedSectionType;
	localText?: string;
	remoteText?: string;
}

export interface AutoMergeResult {
	mergedText: string;
	sections: MergedSection[];
}

// These markers only appears in mergedText, which is never saved while conflicts still exist
const conflictPlaceholder = (local: string, remote: string): string => {
	return `<<<<<<< local\n${local}\n=======\n${remote}\n>>>>>>> remote`;
};

// All three line endings are split on, otherwise a note written on Windows keeps a \r on every line
const splitLines = (text: string) => text.split(/\r\n|\n|\r/);

// True when the given side edited at or next to two or more identical lines in a row
const touchesDuplicateRun = (base: string[], side: string[], options: DiffOptions): boolean => {
	const changes: ArrayChange[] | undefined = diffLines(base, side, options);
	if (!changes) return true;

	let baseIndex = 0;
	let changedStart = -1;
	let changedLength = 0;

	const changedRangeTouchesRun = () => {
		if (changedStart < 0) return false;

		const lastLine = changedLength > 0 ? changedStart + changedLength - 1 : changedStart;
		const from = Math.max(0, changedStart - 1);
		const to = Math.min(base.length - 2, lastLine);

		for (let i = from; i <= to; i++) {
			if (base[i] === base[i + 1]) return true;
		}

		// An insertion past the last line still sits against the final pair
		if (changedLength === 0 && changedStart > to && base.length >= 2) {
			return base[base.length - 2] === base[base.length - 1];
		}

		return false;
	};

	for (const change of changes) {
		if (!change.added && !change.removed) {
			if (changedRangeTouchesRun()) return true;
			changedStart = -1;
			changedLength = 0;
			baseIndex += change.count;
		} else {
			if (changedStart < 0) changedStart = baseIndex;
			if (change.removed) {
				changedLength += change.count;
				baseIndex += change.count;
			}
		}
	}

	return changedRangeTouchesRun();
};

const bothSidesChanged = (base: string[], local: string[], remote: string[]): boolean => {
	const same = (a: string[], b: string[]) => a.length === b.length && a.every((line, i) => line === b[i]);
	return !same(base, local) && !same(base, remote) && !same(local, remote);
};

// Used by the conflict UI when a note has no base
// Without an ancestor every difference is a conflict
const compare = (localRaw: string, remoteRaw: string, options: DiffOptions): AutoMergeResult => {
	const localLines = splitLines(localRaw);
	const remoteLines = splitLines(remoteRaw);
	const changes = diffLines(localLines, remoteLines, options);

	// Too different to compare without blocking app, so the whole note will be a conflict
	if (!changes) {
		const text = conflictPlaceholder(localRaw, remoteRaw);
		return { mergedText: text, sections: [{ text, type: 'conflict', localText: localRaw, remoteText: remoteRaw }] };
	}

	const sections: MergedSection[] = [];
	const mergedParts: string[] = [];

	const addConflict = (local: string[], remote: string[]) => {
		if (!local.length && !remote.length) return;
		const localText = local.join('\n');
		const remoteText = remote.join('\n');
		const text = conflictPlaceholder(localText, remoteText);
		sections.push({ text, type: 'conflict', localText, remoteText });
		mergedParts.push(text);
	};

	// A replacement comes as a removal followed by an addition,
	// so combined them into one conflict.
	let removed: string[] = [];
	let added: string[] = [];

	for (const change of changes) {
		if (change.added) {
			added = added.concat(change.value);
			continue;
		}
		if (change.removed) {
			removed = removed.concat(change.value);
			continue;
		}

		addConflict(removed, added);
		removed = [];
		added = [];

		const text = change.value.join('\n');
		sections.push({ text, type: 'unchanged' });
		mergedParts.push(text);
	}

	addConflict(removed, added);

	return { mergedText: mergedParts.join('\n'), sections };
};

// The cached diffs hold on to note contents, so they are dropped once the diff is done
export const twoWayDiff = (localRaw: string, remoteRaw: string, options: DiffOptions = viewerDiffOptions): AutoMergeResult => {
	try {
		return compare(localRaw, remoteRaw, options);
	} finally {
		clearDiffCache();
	}
};

const singleSection = (text: string, type: MergedSectionType): AutoMergeResult => ({
	mergedText: text,
	sections: [{ text, type }],
});

const merge = (baseRaw: string, localRaw: string, remoteRaw: string, options: DiffOptions): AutoMergeResult => {
	// The result is already known, so diffing is skipped. One side changing still counts it as a merge
	if (localRaw === baseRaw && remoteRaw === baseRaw) return singleSection(localRaw, 'unchanged');
	if (localRaw === remoteRaw) return singleSection(localRaw, 'auto-merged');
	if (localRaw === baseRaw) return singleSection(remoteRaw, 'auto-merged');
	if (remoteRaw === baseRaw) return singleSection(localRaw, 'auto-merged');

	const baseLines = splitLines(baseRaw);
	const localLines = splitLines(localRaw);
	const remoteLines = splitLines(remoteRaw);

	// With duplicate lines, diff3 can't tell which copy was changed, so it may apply both
	// edits and duplicate content. A merge too large to diff is treated the same
	// way, since blocking the UI is worse than falling back to a conflict.
	const ambiguous = bothSidesChanged(baseLines, localLines, remoteLines) &&
		(touchesDuplicateRun(baseLines, localLines, options) || touchesDuplicateRun(baseLines, remoteLines, options));

	const regions: Region[]|null = ambiguous ? null : boundedDiff3MergeRegions(localLines, baseLines, remoteLines, options);

	// A null result means the diff was too large to compute, so a conflict is safer than blocking the app
	if (!regions) {
		const localText = localLines.join('\n');
		const remoteText = remoteLines.join('\n');
		return {
			mergedText: conflictPlaceholder(localText, remoteText),
			sections: [{ text: conflictPlaceholder(localText, remoteText), type: 'conflict', localText, remoteText }],
		};
	}

	const sections: MergedSection[] = [];
	const mergedParts: string[] = [];

	for (const region of regions) {
		if (region.stable === true) {
			const text = region.bufferContent.join('\n');
			// buffer 'o' = all sides agreed; 'a'/'b' = one side's change, taken cleanly
			sections.push({ text, type: region.buffer === 'o' ? 'unchanged' : 'auto-merged' });
			mergedParts.push(text);
		} else {
			const localText = region.aContent.join('\n');
			const remoteText = region.bContent.join('\n');

			// Both sides made the same change, so it isn't a real conflict. Keep deleted
			// regions deleted.
			if (localText === remoteText) {
				if (region.aContent.length) {
					sections.push({ text: localText, type: 'auto-merged' });
					mergedParts.push(localText);
				}
				continue;
			}

			const text = conflictPlaceholder(localText, remoteText);
			sections.push({ text, type: 'conflict', localText, remoteText });
			mergedParts.push(text);
		}
	}

	return { mergedText: mergedParts.join('\n'), sections };
};

// The cached diffs hold on to note contents, so they are dropped once the merge is done
export const autoMerge = (baseRaw: string, localRaw: string, remoteRaw: string, options: DiffOptions = diffOptions): AutoMergeResult => {
	try {
		return merge(baseRaw, localRaw, remoteRaw, options);
	} finally {
		clearDiffCache();
	}
};
