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

const isTableLine = (line: string) => line.trimStart().startsWith('|');

const isDelimiterLine = (line: string) => /^\s*\|[\s:|-]*$/.test(line) && line.includes('-');

// Keep spaces between words; remove spaces used only for column alignment.
const paddingRanges = (line: string) => {
	if (!isTableLine(line)) return [];

	const ranges: [number, number][] = [];

	if (isDelimiterLine(line)) {
		const dashes = /-+/g;
		let match = dashes.exec(line);
		while (match) {
			ranges.push([match.index, match.index + match[0].length]);
			match = dashes.exec(line);
		}
	}
	for (let i = 0; i < line.length; i++) {
		if (line[i] !== '|') continue;
		let from = i;
		while (from > 0 && /[^\S\n]/.test(line[from - 1])) from--;
		if (from < i) ranges.push([from, i]);
	}

	let tail = line.length;
	while (tail > 0 && /[^\S\n]/.test(line[tail - 1])) tail--;
	if (tail < line.length) ranges.push([tail, line.length]);

	return ranges;
};

// Only stop highlighting this table spacing; normal spacing and line breaks stay marked.
const clearTablePadding = (side: WordDiffSegment[], text: string) => {
	if (!side.some(segment => segment.highlighted && segment.text.trim() !== '')) return side;

	const result: WordDiffSegment[] = [];
	let position = 0;
	let cachedLineStart = -1;
	let cachedRanges: [number, number][] = [];

	const push = (value: string, highlighted: boolean) => {
		if (value === '') return;
		const last = result[result.length - 1];
		if (last && last.highlighted === highlighted) {
			last.text += value;
		} else {
			result.push({ text: value, highlighted });
		}
	};

	for (const segment of side) {
		if (!segment.highlighted) {
			push(segment.text, false);
			position += segment.text.length;
			continue;
		}

		let runStart = 0;
		let runIsPadding: boolean|null = null;

		for (let i = 0; i <= segment.text.length; i++) {
			let isPadding = false;
			if (i < segment.text.length) {
				const at = position + i;
				const lineStart = text.lastIndexOf('\n', at - 1) + 1;
				if (lineStart !== cachedLineStart) {
					const lineEnd = text.indexOf('\n', lineStart);
					cachedRanges = paddingRanges(text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd));
					cachedLineStart = lineStart;
				}
				const column = at - lineStart;
				isPadding = cachedRanges.some(([from, to]) => column >= from && column < to);
			}

			if (i === segment.text.length || (runIsPadding !== null && isPadding !== runIsPadding)) {
				push(segment.text.slice(runStart, i), !runIsPadding);
				runStart = i;
			}
			runIsPadding = isPadding;
		}

		position += segment.text.length;
	}

	return result;
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

	return {
		local: clearTablePadding(result.local, local),
		remote: clearTablePadding(result.remote, remote),
	};
};
