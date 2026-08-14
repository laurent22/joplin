// require: node-diff3's type exports are not resolvable under this moduleResolution
const { diff3MergeRegions, diffComm } = require('node-diff3');

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

	// KNOWN LIMITATION: when the base has consecutive identical lines, node-diff3
	// may match an edit to the wrong line, which can produce duplicate content.
	// Fixing this would require changing how the merge is done.
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

			// Both sides made the identical change: diff3 flags it as unstable, but it's not a real conflict
			if (localText === remoteText) {
				sections.push({ text: localText, type: 'auto-merged' });
				mergedParts.push(localText);
				continue;
			}

			const text = conflictPlaceholder(localText, remoteText);
			sections.push({ text, type: 'conflict', localText, remoteText });
			mergedParts.push(text);
		}
	}

	return { mergedText: mergedParts.join('\n'), sections };
};
