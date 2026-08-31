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

const isTableLine = (line: string) => line.trimStart().startsWith('|');
const splitCells = (line: string) => {
	const cells: string[] = [];
	let current = '';

	for (let i = 0; i < line.length; i++) {
		if (line[i] === '\\' && i + 1 < line.length) {
			current += line[i] + line[i + 1];
			i++;
		} else if (line[i] === '|') {
			cells.push(current);
			current = '';
		} else {
			current += line[i];
		}
	}
	cells.push(current);

	return cells;
};

// Used only to make both versions match, never rendered: the original line is
// highlighted and written back.
const normaliseLine = (line: string): string => {
	if (isTableLine(line)) {
		return splitCells(line)
			.map(cell => (/^\s*:?-+:?\s*$/.test(cell) ? cell.replace(/-+/, '-') : cell).trim())
			.join('|');
	}

	// Trailing whitespace is invisible noise which can cause false conflicts, but
	// two trailing spaces are kept (markdown hard line break)
	return line.replace(/[ \t]+$/, match => match === '  ' ? '  ' : '');
};

// Lines are compared normalised so invisible whitespace can't cause a false
// conflict, but the originals are what get written back. All three line endings are
// split on, otherwise a note written on Windows keeps a \r on every line.
const splitLines = (text: string) => {
	const original = text.split(/\r\n|\n|\r/);
	return { original, normalised: original.map(normaliseLine) };
};

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
		const rawComm: CommRegion[] = diffComm(localLines.normalised, remoteLines.normalised);

		// One conflict can come as multiple regions holding only one side each,
		// so they are joined to keep the two versions together.
		const comm: CommRegion[] = [];
		for (let i = 0; i < rawComm.length; i++) {
			const region = rawComm[i];
			const previous = comm[comm.length - 1];
			const next = rawComm[i + 1];
			const isBlankCommon = !!region.common && region.common.every(line => line.trim() === '');

			if (isBlankCommon && previous && !previous.common && next && !next.common) {
				previous.buffer1 = previous.buffer1.concat(region.common);
				previous.buffer2 = previous.buffer2.concat(region.common);
				continue;
			}

			if (previous && !previous.common && !region.common) {
				previous.buffer1 = previous.buffer1.concat(region.buffer1);
				previous.buffer2 = previous.buffer2.concat(region.buffer2);
				continue;
			}

			comm.push({ ...region, buffer1: [...(region.buffer1 ?? [])], buffer2: [...(region.buffer2 ?? [])] });
		}

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

	const regions: Region[] = diff3MergeRegions(localLines.normalised, baseLines.normalised, remoteLines.normalised);

	const sides = { a: localLines.original, o: baseLines.original, b: remoteLines.original };

	const sections: MergedSection[] = [];
	const mergedParts: string[] = [];

	// Unstable regions use normalised lines without positions, so kept the original
	// lines to preserve the user's spacing.
	let localIndex = 0;
	let remoteIndex = 0;

	for (const region of regions) {
		if (region.stable === true) {
			const text = originalRegionLines(region, sides).join('\n');
			if (region.buffer === 'a' || region.buffer === 'o') localIndex += region.bufferLength;
			if (region.buffer === 'b' || region.buffer === 'o') remoteIndex += region.bufferLength;
			// buffer 'o' = all sides agreed; 'a'/'b' = one side's change, taken cleanly
			sections.push({ text, type: region.buffer === 'o' ? 'unchanged' : 'auto-merged' });
			mergedParts.push(text);
		} else {
			const localText = localLines.original.slice(localIndex, localIndex + region.aContent.length).join('\n');
			const remoteText = remoteLines.original.slice(remoteIndex, remoteIndex + region.bContent.length).join('\n');
			localIndex += region.aContent.length;
			remoteIndex += region.bContent.length;

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
