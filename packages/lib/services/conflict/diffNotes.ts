// node-diff3 does not export its types in a way that this package's
// moduleResolution can use, so we require it instead of importing it.
// The types we need are defined locally.
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

// diffComm returns a `common` array for matching parts and buffer1/buffer2
// for different parts. node-diff3's types do not include `common`,
// so it is defined here.
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

// Marker added to mergedText when a real conflict is found. Git's conflict
// markers are used so it is easy to recognize. mergedText is only used when
// there are no conflict sections, so this marker is never saved. It is only
// added to keep mergedText accurate.
const conflictPlaceholder = (local: string, remote: string): string => {
	return `<<<<<<< local\n${local}\n=======\n${remote}\n>>>>>>> remote`;
};

// // Split the text into words and separate punctuation marks, so "hello,"
// becomes ["hello", ","]. Comparing these tokens allows two changes in the
// same line to merge if they modify different words.
const tokenizeWords = (text: string): string[] => {
	return text.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) ?? [];
};

// A line conflict can still be merged automatically if both sides changed
// different words in the same line. Run the three-way merge again on word
// tokens. It is only a real conflict if some word changes still overlap.
const tryWordMerge = (local: string, base: string, remote: string): { merged: string; conflict: boolean } => {
	const regions: Region[] = diff3MergeRegions(tokenizeWords(local), tokenizeWords(base), tokenizeWords(remote));
	let merged = '';
	for (const region of regions) {
		if (region.stable === true) {
			merged += region.bufferContent.join('');
		} else if (region.aContent.join('') === region.bContent.join('')) {
			// Not a real word-level conflict because both sides made the same change.
			merged += region.aContent.join('');
		} else {
			return { merged: '', conflict: true };
		}
	}
	return { merged, conflict: false };
};

// Remove extra spaces at the end of each line. Editors and the markdown save
// process can leave invisible spaces there, which can make diff3 think a line
// has changed when it really hasn't, causing a false conflict.
//
// Exactly two spaces at the end of a line are kept because they create a
// Markdown line break. Any other trailing spaces or tabs are removed.
const normaliseTrailingWhitespace = (text: string): string => {
	return text.split('\n').map(line => line.replace(/[ \t]+$/, match => match === '  ' ? '  ' : '')).join('\n');
};

// Run a three-way merge on the note content. Changes made by only one side
// are merged automatically, while changes made differently on both sides
// remain as conflicts. If there is no base version, it falls back to a
// line-by-line comparison where only different lines become conflicts.
export const autoMerge = (baseRaw: string, localRaw: string, remoteRaw: string): AutoMergeResult => {
	const base = normaliseTrailingWhitespace(baseRaw);
	const local = normaliseTrailingWhitespace(localRaw);
	const remote = normaliseTrailingWhitespace(remoteRaw);

	if (base === '') {
		// Without a base version, we cannot know which side made which changes,
		// so nothing can be merged automatically. We still compare both versions
		// line by line and only mark the different lines as conflicts, while
		// keeping matching lines (including unchanged paragraphs) unchanged.
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
			// buffer 'o' means all three sides agreed here; 'a'/'b' means one side
			// changed it and diff3 took that change cleanly.
			sections.push({ text, type: region.buffer === 'o' ? 'unchanged' : 'auto-merged' });
			mergedParts.push(text);
		} else {
			const localText = region.aContent.join('\n');
			const baseText = region.oContent.join('\n');
			const remoteText = region.bContent.join('\n');

			// False conflict: both sides made the identical change. diff3MergeRegions
			// still reports it as unstable, so collapse it to an auto-merge here.
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
