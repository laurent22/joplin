// require: node-diff3's type exports are not resolvable under this moduleResolution
const { diff3MergeRegions, diffComm, diffIndices } = require('node-diff3');

interface StableRegion {
	stable: true;
	buffer: 'a' | 'o' | 'b';
	bufferStart: number;
	bufferLength: number;
	bufferContent: string[];
}

interface UnstableRegion {
	stable: false;
	aContent: string[];
	oContent: string[];
	bContent: string[];
}

type Region = StableRegion | UnstableRegion;

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

// Trailing whitespace is invisible noise which can cause false conflicts
// Two trailing spaces are kept (markdown hard line break)
const normaliseLine = (line: string): string => {
	return line.replace(/[ \t]+$/, match => match === '  ' ? '  ' : '');
};

// Lines are compared normalised so invisible whitespace can't cause a false
// conflict, but the originals are what get written back. All three line endings are
// split on, otherwise a note written on Windows keeps a \r on every line.
const splitLines = (text: string) => {
	const original = text.split(/\r\n|\n|\r/);
	return { original, normalised: original.map(normaliseLine) };
};

// Stable regions keep their original text, while unstable regions use normalised text.
// KNOWN LIMITATION: trailing-whitespace-only changes can be lost because the
// normalised line matches the base and the original is taken from the base.
const originalRegionLines = (region: StableRegion, sides: Record<'a' | 'o' | 'b', string[]>): string[] => {
	const source = sides[region.buffer];
	const originals = source.slice(region.bufferStart, region.bufferStart + region.bufferLength);
	return originals.length === region.bufferContent.length ? originals : region.bufferContent;
};

interface DiffIndicesRegion {
	buffer1: [number, number];
}

// True when the given side edited at or next to two or more identical lines in a row
const touchesDuplicateRun = (base: string[], side: string[]): boolean => {
	const changes: DiffIndicesRegion[] = diffIndices(base, side);

	for (const change of changes) {
		const [start, length] = change.buffer1;

		// Compare each line with the next to find identical pairs. Check the pairs
		// touched by an edit; for an insertion, check both sides of the gap.
		const lastLine = length > 0 ? start + length - 1 : start;
		const from = Math.max(0, start - 1);
		const to = Math.min(base.length - 2, lastLine);

		for (let i = from; i <= to; i++) {
			if (base[i] === base[i + 1]) return true;
		}

		// An insertion after the last line still touches the final pair.
		if (length === 0 && start > to && base.length >= 2 && base[base.length - 2] === base[base.length - 1]) {
			return true;
		}
	}

	return false;
};

const bothSidesChanged = (base: string[], local: string[], remote: string[]): boolean => {
	const same = (a: string[], b: string[]) => a.length === b.length && a.every((line, i) => line === b[i]);
	return !same(base, local) && !same(base, remote) && !same(local, remote);
};

export const autoMerge = (baseRaw: string, localRaw: string, remoteRaw: string): AutoMergeResult => {
	const baseLines = splitLines(baseRaw);
	const localLines = splitLines(localRaw);
	const remoteLines = splitLines(remoteRaw);

	const base = baseLines.normalised.join('\n');

	if (base === '') {
		// No base version: we can't tell which side made the changes, so the every
		// different line is treated as a conflict
		const comm: CommRegion[] = diffComm(localLines.normalised, remoteLines.normalised);

		const sections: MergedSection[] = [];
		const mergedParts: string[] = [];

		// diffComm does not return buffer positions, so track them to find original locations
		let localIndex = 0;
		let remoteIndex = 0;

		for (const region of comm) {
			if (region.common) {
				const text = localLines.original.slice(localIndex, localIndex + region.common.length).join('\n');
				localIndex += region.common.length;
				remoteIndex += region.common.length;
				sections.push({ text, type: 'unchanged' });
				mergedParts.push(text);
			} else {
				const localText = localLines.original.slice(localIndex, localIndex + region.buffer1.length).join('\n');
				const remoteText = remoteLines.original.slice(remoteIndex, remoteIndex + region.buffer2.length).join('\n');
				localIndex += region.buffer1.length;
				remoteIndex += region.buffer2.length;
				const text = conflictPlaceholder(localText, remoteText);
				sections.push({ text, type: 'conflict', localText, remoteText });
				mergedParts.push(text);
			}
		}

		return { mergedText: mergedParts.join('\n'), sections };
	}

	// With duplicate lines, diff3 can't tell which copy was changed, so it may
	// apply both edits and duplicate content. We raise a conflict instead.
	const ambiguous = bothSidesChanged(baseLines.normalised, localLines.normalised, remoteLines.normalised) &&
		(touchesDuplicateRun(baseLines.normalised, localLines.normalised) || touchesDuplicateRun(baseLines.normalised, remoteLines.normalised));

	if (ambiguous) {
		const localText = localLines.original.join('\n');
		const remoteText = remoteLines.original.join('\n');
		return {
			mergedText: conflictPlaceholder(localText, remoteText),
			sections: [{ text: conflictPlaceholder(localText, remoteText), type: 'conflict', localText, remoteText }],
		};
	}

	const regions: Region[] = diff3MergeRegions(localLines.normalised, baseLines.normalised, remoteLines.normalised);

	const sides = { a: localLines.original, o: baseLines.original, b: remoteLines.original };

	const sections: MergedSection[] = [];
	const mergedParts: string[] = [];

	for (const region of regions) {
		if (region.stable === true) {
			const text = originalRegionLines(region, sides).join('\n');
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
