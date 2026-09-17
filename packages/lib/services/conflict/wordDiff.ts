import { Diff } from 'diff';

export interface WordDiffSegment {
	text: string;
	highlighted: boolean;
}

export interface WordDiff {
	local: WordDiffSegment[];
	remote: WordDiffSegment[];
}

// Prevents very large texts from blocking the UI. The limit is higher than the
// merge limit, since a short wait is better than no word diff at all
const diffTimeoutMs = 3000;

// jsdiff only treats Latin text as words, so scripts like Cyrillic, Greek,
// and Arabic are split character by character. CJK is kept this way on
// purpose, since treating each character as a token gives better diffs
const cjk = '\\p{sc=Han}\\p{sc=Hiragana}\\p{sc=Katakana}';
const tokenRegex = new RegExp(`(?:(?![${cjk}])[\\p{L}\\p{N}_])+|[${cjk}]|\\s+|[^\\s]`, 'gu');

class UnicodeWordDiff extends Diff<string, string> {
	public tokenize(value: string) {
		return value.match(tokenRegex) ?? [];
	}
}

const unicodeWordDiff = new UnicodeWordDiff();

const pushSegment = (side: WordDiffSegment[], text: string, highlighted: boolean) => {
	if (text === '') return;
	const last = side[side.length - 1];
	if (last && last.highlighted === highlighted) {
		last.text += text;
	} else {
		side.push({ text, highlighted });
	}
};

const wholeTextSegment = (text: string): WordDiffSegment[] => {
	return text === '' ? [] : [{ text, highlighted: true }];
};

// Splits both sides of a conflict into highlighted segments. Joining the
// segments always gives back the original text
export const wordDiff = (localText: string, remoteText: string): WordDiff => {
	const local = localText ?? '';
	const remote = remoteText ?? '';

	if (local === remote) {
		return {
			local: local === '' ? [] : [{ text: local, highlighted: false }],
			remote: remote === '' ? [] : [{ text: remote, highlighted: false }],
		};
	}

	const changes = unicodeWordDiff.diff(local, remote, { timeout: diffTimeoutMs });
	if (!changes) {
		return { local: wholeTextSegment(local), remote: wholeTextSegment(remote) };
	}

	const result: WordDiff = { local: [], remote: [] };
	for (const change of changes) {
		if (change.added) {
			pushSegment(result.remote, change.value, true);
		} else if (change.removed) {
			pushSegment(result.local, change.value, true);
		} else {
			pushSegment(result.local, change.value, false);
			pushSegment(result.remote, change.value, false);
		}
	}
	return result;
};
