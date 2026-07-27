// require: node-diff3's type exports are not resolvable under this moduleResolution
const { diff3MergeRegions, diffComm } = require('node-diff3');

interface StableRegion {
	stable: true;
	buffer: 'a' | 'o' | 'b';
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

const tokenizeWords = (text: string): string[] => {
	return text.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) ?? [];
};

const tryWordMerge = (local: string, base: string, remote: string): { merged: string; conflict: boolean } => {
	const regions: Region[] = diff3MergeRegions(tokenizeWords(local), tokenizeWords(base), tokenizeWords(remote));
	let merged = '';
	for (const region of regions) {
		if (region.stable === true) {
			merged += region.bufferContent.join('');
		} else if (region.aContent.join('') === region.bContent.join('')) {
			merged += region.aContent.join('');
		} else {
			return { merged: '', conflict: true };
		}
	}
	return { merged, conflict: false };
};

// Trailing whitespace is invisible noise which can cause false conflicts
// Two trailing spaces are kept (markdown hard line break)
const normaliseTrailingWhitespace = (text: string): string => {
	return text.split('\n').map(line => line.replace(/[ \t]+$/, match => match === '  ' ? '  ' : '')).join('\n');
};

export const autoMerge = (baseRaw: string, localRaw: string, remoteRaw: string): AutoMergeResult => {
	const base = normaliseTrailingWhitespace(baseRaw);
	const local = normaliseTrailingWhitespace(localRaw);
	const remote = normaliseTrailingWhitespace(remoteRaw);

	if (base === '') {
		// No base version: we can't tell which side made the changes, so the every
		// different line is treated as a conflict
		const comm: CommRegion[] = diffComm(local.split('\n'), remote.split('\n'));

		const sections: MergedSection[] = [];
		const mergedParts: string[] = [];

		for (const region of comm) {
			if (region.common) {
				const text = region.common.join('\n');
				sections.push({ text, type: 'unchanged' });
				mergedParts.push(text);
			} else {
				const localText = region.buffer1.join('\n');
				const remoteText = region.buffer2.join('\n');
				const text = conflictPlaceholder(localText, remoteText);
				sections.push({ text, type: 'conflict', localText, remoteText });
				mergedParts.push(text);
			}
		}

		return { mergedText: mergedParts.join('\n'), sections };
	}

	const regions: Region[] = diff3MergeRegions(local.split('\n'), base.split('\n'), remote.split('\n'));

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
			const baseText = region.oContent.join('\n');
			const remoteText = region.bContent.join('\n');

			// Both sides made the identical change: diff3 flags it as unstable, but it's not a real conflict
			if (localText === remoteText) {
				sections.push({ text: localText, type: 'auto-merged' });
				mergedParts.push(localText);
				continue;
			}

			const word = tryWordMerge(localText, baseText, remoteText);
			if (!word.conflict) {
				sections.push({ text: word.merged, type: 'auto-merged' });
				mergedParts.push(word.merged);
			} else {
				const text = conflictPlaceholder(localText, remoteText);
				sections.push({ text, type: 'conflict', localText, remoteText });
				mergedParts.push(text);
			}
		}
	}

	return { mergedText: mergedParts.join('\n'), sections };
};
