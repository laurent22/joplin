// require: node-diff3's type exports are not resolvable under this moduleResolution
const { diffComm } = require('node-diff3');
import boundedDiff3MergeRegions, { ArrayChange, clearDiffCache, diffLines, Region } from './boundedDiff3';

// diffComm's `common` field is missing from the node-diff3 types
interface CommRegion {
	common?: string[];
	buffer1: string[];
	buffer2: string[];
}

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
const touchesDuplicateRun = (base: string[], side: string[]): boolean => {
	const changes: ArrayChange[] | undefined = diffLines(base, side);
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

const merge = (baseRaw: string, localRaw: string, remoteRaw: string): AutoMergeResult => {
	const baseLines = splitLines(baseRaw);
	const localLines = splitLines(localRaw);
	const remoteLines = splitLines(remoteRaw);

	const base = baseLines.join('\n');

	if (base === '') {
		// No base version: we can't tell which side made the changes, so the every
		// different line is treated as a conflict
		const comm: CommRegion[] = diffComm(localLines, remoteLines);

		const sections: MergedSection[] = [];
		const mergedParts: string[] = [];

		// diffComm does not return buffer positions, so track them to find original locations
		let localIndex = 0;
		let remoteIndex = 0;

		for (const region of comm) {
			if (region.common) {
				const text = localLines.slice(localIndex, localIndex + region.common.length).join('\n');
				localIndex += region.common.length;
				remoteIndex += region.common.length;
				sections.push({ text, type: 'unchanged' });
				mergedParts.push(text);
			} else {
				const localText = localLines.slice(localIndex, localIndex + region.buffer1.length).join('\n');
				const remoteText = remoteLines.slice(remoteIndex, remoteIndex + region.buffer2.length).join('\n');
				localIndex += region.buffer1.length;
				remoteIndex += region.buffer2.length;
				const text = conflictPlaceholder(localText, remoteText);
				sections.push({ text, type: 'conflict', localText, remoteText });
				mergedParts.push(text);
			}
		}

		return { mergedText: mergedParts.join('\n'), sections };
	}

	// With duplicate lines, diff3 can't tell which copy was changed, so it may apply both
	// edits and duplicate content. A merge too large to diff is treated the same
	// way, since blocking the UI is worse than falling back to a conflict.
	const ambiguous = bothSidesChanged(baseLines, localLines, remoteLines) &&
		(touchesDuplicateRun(baseLines, localLines) || touchesDuplicateRun(baseLines, remoteLines));

	const regions: Region[]|null = ambiguous ? null : boundedDiff3MergeRegions(localLines, baseLines, remoteLines);

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
export const autoMerge = (baseRaw: string, localRaw: string, remoteRaw: string): AutoMergeResult => {
	try {
		return merge(baseRaw, localRaw, remoteRaw);
	} finally {
		clearDiffCache();
	}
};
