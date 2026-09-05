import { Diff, diffLines } from 'diff';

export interface WordDiffSegment {
	text: string;
	highlighted: boolean;
}

export interface WordDiff {
	local: WordDiffSegment[];
	remote: WordDiffSegment[];
}

// Prevents very large texts from blocking the UI.
const diffTimeoutMs = 1000;

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

// Past this point, the line is mostly rewritten, so smaller matches are ignored.
const rewriteThreshold = 0.7;

const changedRatio = (changes: { value: string; added?: boolean; removed?: boolean }[], side: 'added'|'removed') => {
	let changed = 0;
	let total = 0;
	for (const change of changes) {
		if (change.added && side === 'removed') continue;
		if (change.removed && side === 'added') continue;
		total += change.value.length;
		if (change[side]) changed += change.value.length;
	}
	return total === 0 ? 0 : changed / total;
};

const diffOneLine = (result: WordDiff, local: string, remote: string) => {
	if (local === remote) {
		pushSegment(result.local, local, false);
		pushSegment(result.remote, remote, false);
		return;
	}

	const changes = unicodeWordDiff.diff(local, remote, { timeout: diffTimeoutMs });
	if (!changes) {
		pushSegment(result.local, local, true);
		pushSegment(result.remote, remote, true);
		return;
	}

	if (changedRatio(changes, 'removed') > rewriteThreshold || changedRatio(changes, 'added') > rewriteThreshold) {
		pushSegment(result.local, local, true);
		pushSegment(result.remote, remote, true);
		return;
	}

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

	// Lines are matched first, so word diff cannot match words across different lines.
	const lineChanges = diffLines(local, remote);
	const result: WordDiff = { local: [], remote: [] };

	// diffLines keeps newlines in each value, so joining the segments reproduces the original text.
	const splitLines = (value: string) => value.match(/[^\n]*\n|[^\n]+/g) ?? [];

	for (let i = 0; i < lineChanges.length; i++) {
		const change = lineChanges[i];

		if (!change.added && !change.removed) {
			pushSegment(result.local, change.value, false);
			pushSegment(result.remote, change.value, false);
			continue;
		}

		// A removal followed by an addition means the same lines were rewritten.
		const next = lineChanges[i + 1];
		if (change.removed && next?.added) {
			const removedLines = splitLines(change.value);
			const addedLines = splitLines(next.value);

			for (let line = 0; line < Math.max(removedLines.length, addedLines.length); line++) {
				const localLine = removedLines[line];
				const remoteLine = addedLines[line];

				// Nothing on the other side to compare against
				if (localLine === undefined) {
					pushSegment(result.remote, remoteLine, true);
					continue;
				}
				if (remoteLine === undefined) {
					pushSegment(result.local, localLine, true);
					continue;
				}

				// The newline belongs to the line but is not part of what changed
				const localBreak = localLine.endsWith('\n');
				const remoteBreak = remoteLine.endsWith('\n');
				diffOneLine(
					result,
					localBreak ? localLine.slice(0, -1) : localLine,
					remoteBreak ? remoteLine.slice(0, -1) : remoteLine,
				);
				if (localBreak) pushSegment(result.local, '\n', false);
				if (remoteBreak) pushSegment(result.remote, '\n', false);
			}

			i++;
			continue;
		}

		if (change.removed) {
			pushSegment(result.local, change.value, true);
		} else {
			pushSegment(result.remote, change.value, true);
		}
	}

	return result;
};
