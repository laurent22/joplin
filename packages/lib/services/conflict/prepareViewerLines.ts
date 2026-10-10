const { diffArrays } = require('diff');
import { ArrayChange, DiffLines, DiffOptions, viewerDiffOptions } from './boundedDiff3';
import { WordDiffSegment } from './wordDiff';

export interface PreparedLine {
	text: string;
	isTableRow: boolean;
	comparisonText: string;
}

interface PreparedChange {
	added?: boolean;
	removed?: boolean;
	count: number;
	value: PreparedLine[];
}

const fenceMarker = /^\s{0,3}((`{3,})|(~{3,}))/;

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

const normaliseTableLine = (line: string) => {
	return splitCells(line)
		.map(cell => (/^\s*:?-+:?\s*$/.test(cell) ? cell.replace(/-+/, '-') : cell).trim())
		.join('|');
};

export const looksLikeTableRow = (line: string) => line.trimStart().startsWith('|');

const hasTrailingOuterPipe = (line: string) => /(^|[^\\])(?:\\\\)*\|[ \t]*$/.test(line);

export const isDelimiterRow = (line: string) => {
	if (!looksLikeTableRow(line)) return false;
	const cells = splitCells(line);
	cells.shift();
	if (hasTrailingOuterPipe(line)) cells.pop();
	return cells.length > 0 && cells.every(cell => /^\s*:?-+:?\s*$/.test(cell.trim()));
};

export const prepareViewerLines = (lines: string[]): PreparedLine[] => {
	const isTableRow = new Array<boolean>(lines.length).fill(false);
	let fence: { char: string; length: number }|null = null;

	for (let i = 0; i < lines.length; i++) {
		const marker = fenceMarker.exec(lines[i]);
		if (marker) {
			const run = marker[1];
			if (!fence) {
				fence = { char: run[0], length: run.length };
				continue;
			}
			const afterRun = lines[i].slice(marker[0].length);
			if (run[0] === fence.char && run.length >= fence.length && /^[ \t]*$/.test(afterRun)) {
				fence = null;
				continue;
			}
		}
		if (fence || !isDelimiterRow(lines[i])) continue;

		// The header above and every unbroken row below belong to the same table
		isTableRow[i] = true;
		if (i > 0 && looksLikeTableRow(lines[i - 1])) isTableRow[i - 1] = true;
		for (let j = i + 1; j < lines.length && looksLikeTableRow(lines[j]); j++) {
			isTableRow[j] = true;
		}
	}

	return lines.map((text, i) => ({
		text,
		isTableRow: isTableRow[i],
		comparisonText: isTableRow[i] ? normaliseTableLine(text) : text,
	}));
};

export interface ViewerDiffOptions extends DiffOptions {
	ignoreTrailingWhitespace?: boolean;
}

export const viewerLineOptions: ViewerDiffOptions = { ...viewerDiffOptions, ignoreTrailingWhitespace: true };

const trimEnd = (line: string) => line.replace(/[ \t]+$/, '');

const sameViewerLine = (a: PreparedLine, b: PreparedLine, ignoreTrailingWhitespace: boolean) => {
	if (a.text === b.text) return true;
	if (a.isTableRow && b.isTableRow) return a.comparisonText === b.comparisonText;
	return ignoreTrailingWhitespace && trimEnd(a.text) === trimEnd(b.text);
};

export const createViewerDiffLines = (options: ViewerDiffOptions = viewerLineOptions): DiffLines => {
	const cache: { base: string[]; side: string[]; changes: ArrayChange[]|undefined }[] = [];

	return (base, side) => {
		const cached = cache.find(entry => entry.base === base && entry.side === side);
		if (cached) return cached.changes;

		const comparator = (a: PreparedLine, b: PreparedLine) => {
			return sameViewerLine(a, b, options.ignoreTrailingWhitespace);
		};
		const prepared: PreparedChange[]|undefined = diffArrays(
			prepareViewerLines(base), prepareViewerLines(side), { ...options, comparator },
		);
		const changes = prepared?.map(change => ({
			...change,
			value: change.value.map((line: PreparedLine) => line.text),
		}));

		cache.push({ base, side, changes });
		return changes;
	};
};


const paddingRanges = (line: string) => {
	if (!looksLikeTableRow(line)) return [];

	const ranges: [number, number][] = [];

	if (isDelimiterRow(line)) {
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

export const clearTablePadding = (side: WordDiffSegment[], text: string) => {
	if (!side.some(segment => segment.highlighted && segment.text.trim() !== '')) return side;

	const result: WordDiffSegment[] = [];
	let position = 0;
	let cachedLineStart = -1;
	let cachedRanges: [number, number][] = [];

	let scannedLineStart = 0;
	let nextNewline = text.indexOf('\n');
	const lineStartAt = (at: number) => {
		while (nextNewline !== -1 && nextNewline < at) {
			scannedLineStart = nextNewline + 1;
			nextNewline = text.indexOf('\n', scannedLineStart);
		}
		return scannedLineStart;
	};

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
				const lineStart = lineStartAt(at);
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
