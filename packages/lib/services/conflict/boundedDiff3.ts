// A local copy of node-diff3's diff3MergeRegions (MIT licensed). The region combining is
// unchanged; only the hunks come from a bounded Myers diff rather than its LCS, which
// blocks the UI for seconds on a long note.
const { diffArrays } = require('diff');
import prepareLines, { PreparedLine } from './prepareLines';

interface StableRegion {
	stable: true;
	buffer: 'a' | 'o' | 'b';
	bufferStart: number;
	bufferLength: number;
	bufferContent: string[];
}

interface UnstableRegion {
	stable: false;
	aStart: number;
	aLength: number;
	aContent: string[];
	oStart: number;
	oLength: number;
	oContent: string[];
	bStart: number;
	bLength: number;
	bContent: string[];
}

export type Region = StableRegion | UnstableRegion;

export interface ArrayChange {
	added?: boolean;
	removed?: boolean;
	count: number;
	value: string[];
}

interface PreparedChange {
	added?: boolean;
	removed?: boolean;
	count: number;
	value: PreparedLine[];
}

interface Hunk {
	ab: 'a' | 'b';
	oStart: number;
	oLength: number;
	abStart: number;
	abLength: number;
}

// The merge runs during sync, so it times out sooner than the conflict viewer
export interface DiffOptions {
	maxEditLength: number;
	timeout: number;
	ignoreTrailingWhitespace?: boolean;
}

export const diffOptions: DiffOptions = { maxEditLength: 5000, timeout: 1000 };
export const viewerDiffOptions: DiffOptions = { maxEditLength: 10000, timeout: 3000, ignoreTrailingWhitespace: true };

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

const trimEnd = (line: string) => line.replace(/[ \t]+$/, '');

// Used only to decide whether two table lines match, never emitted: editing one
// cell re-pads every row, which would otherwise make the whole table a conflict
const normaliseTableLine = (line: string) => {
	return splitCells(line)
		.map(cell => (/^\s*:?-+:?\s*$/.test(cell) ? cell.replace(/-+/, '-') : cell).trim())
		.join('|');
};

// Table rows ignore column padding
const samePreparedLine = (a: PreparedLine, b: PreparedLine, ignoreTrailingWhitespace: boolean) => {
	if (a.text === b.text) return true;
	if (a.isTableRow && b.isTableRow) return a.comparisonText === b.comparisonText;
	return ignoreTrailingWhitespace && trimEnd(a.text) === trimEnd(b.text);
};

export const sameLine = (a: string, b: string, ignoreTrailingWhitespace = false) => {
	if (a === b) return true;
	if (isTableLine(a) && isTableLine(b)) return normaliseTableLine(a) === normaliseTableLine(b);
	return ignoreTrailingWhitespace && trimEnd(a) === trimEnd(b);
};

// The duplicate line check and the merge diff the same two pairs, so whichever runs
// second reuses the result
export type DiffLines = (base: string[], side: string[])=> ArrayChange[]|undefined;

// The cache belongs to one merge, so it cannot be shared with another
// and is released along with it.
export const createDiffLines = (options: DiffOptions = diffOptions): DiffLines => {
	const cache: { base: string[]; side: string[]; changes: ArrayChange[]|undefined }[] = [];

	return (base, side) => {
		const cached = cache.find(entry => entry.base === base && entry.side === side);
		if (cached) return cached.changes;

		// Diffing the prepared lines rather than the raw text
		const comparator = (a: PreparedLine, b: PreparedLine) => {
			return samePreparedLine(a, b, options.ignoreTrailingWhitespace);
		};
		const prepared: PreparedChange[]|undefined = diffArrays(
			prepareLines(base), prepareLines(side), { ...options, comparator },
		);
		const changes = prepared?.map(change => ({
			...change,
			value: change.value.map((line: PreparedLine) => line.text),
		}));
		cache.push({ base, side, changes });
		return changes;
	};
};

// Where the two buffers differ, in the same shape as node-diff3's diffIndices
const boundedDiffIndices = (o: string[], side: string[], diffLines: DiffLines) => {
	const changes = diffLines(o, side);
	if (!changes) return null;

	const result: { oStart: number; oLength: number; sideStart: number; sideLength: number }[] = [];
	let oIndex = 0;
	let sideIndex = 0;
	let start: { o: number; side: number }|null = null;
	let oLength = 0;
	let sideLength = 0;

	const flush = () => {
		if (start) result.push({ oStart: start.o, oLength, sideStart: start.side, sideLength });
		start = null;
		oLength = 0;
		sideLength = 0;
	};

	for (const change of changes) {
		if (!change.added && !change.removed) {
			flush();
			oIndex += change.count;
			sideIndex += change.count;
			continue;
		}

		if (!start) start = { o: oIndex, side: sideIndex };

		if (change.removed) {
			oLength += change.count;
			oIndex += change.count;
		} else {
			sideLength += change.count;
			sideIndex += change.count;
		}
	}

	flush();
	return result;
};

// Null when the diff cannot be merged, so the caller can fall back to a conflict
export default (a: string[], o: string[], b: string[], diffLines: DiffLines): Region[]|null => {
	const hunks: Hunk[] = [];

	for (const ab of ['a', 'b'] as const) {
		const changes = boundedDiffIndices(o, ab === 'a' ? a : b, diffLines);
		if (!changes) return null;
		for (const change of changes) {
			hunks.push({ ab, oStart: change.oStart, oLength: change.oLength, abStart: change.sideStart, abLength: change.sideLength });
		}
	}

	hunks.sort((x, y) => x.oStart - y.oStart);

	const results: Region[] = [];
	let currOffset = 0;

	const advanceTo = (endOffset: number) => {
		if (endOffset > currOffset) {
			results.push({
				stable: true,
				buffer: 'o',
				bufferStart: currOffset,
				bufferLength: endOffset - currOffset,
				bufferContent: o.slice(currOffset, endOffset),
			});
			currOffset = endOffset;
		}
	};

	while (hunks.length) {
		let hunk = hunks.shift();
		const regionStart = hunk.oStart;
		let regionEnd = hunk.oStart + hunk.oLength;
		const regionHunks = [hunk];
		advanceTo(regionStart);

		while (hunks.length) {
			const nextHunk = hunks[0];
			if (nextHunk.oStart > regionEnd) break;

			regionEnd = Math.max(regionEnd, nextHunk.oStart + nextHunk.oLength);
			regionHunks.push(hunks.shift());
		}

		if (regionHunks.length === 1) {
			// Only one side changed here, so it can be taken as is
			if (hunk.abLength > 0) {
				const buffer = hunk.ab === 'a' ? a : b;
				results.push({
					stable: true,
					buffer: hunk.ab,
					bufferStart: hunk.abStart,
					bufferLength: hunk.abLength,
					bufferContent: buffer.slice(hunk.abStart, hunk.abStart + hunk.abLength),
				});
			}
		} else {
			// Both sides changed here. Each side's hunks become one span, corrected for the
			// differing amounts of `o` they covered
			const bounds: Record<'a'|'b', [number, number, number, number]> = {
				a: [a.length, -1, o.length, -1],
				b: [b.length, -1, o.length, -1],
			};

			while (regionHunks.length) {
				hunk = regionHunks.shift();
				const oEnd = hunk.oStart + hunk.oLength;
				const abEnd = hunk.abStart + hunk.abLength;
				const bound = bounds[hunk.ab];
				bound[0] = Math.min(hunk.abStart, bound[0]);
				bound[1] = Math.max(abEnd, bound[1]);
				bound[2] = Math.min(hunk.oStart, bound[2]);
				bound[3] = Math.max(oEnd, bound[3]);
			}

			const aStart = bounds.a[0] + (regionStart - bounds.a[2]);
			const aEnd = bounds.a[1] + (regionEnd - bounds.a[3]);
			const bStart = bounds.b[0] + (regionStart - bounds.b[2]);
			const bEnd = bounds.b[1] + (regionEnd - bounds.b[3]);

			results.push({
				stable: false,
				aStart,
				aLength: aEnd - aStart,
				aContent: a.slice(aStart, aEnd),
				oStart: regionStart,
				oLength: regionEnd - regionStart,
				oContent: o.slice(regionStart, regionEnd),
				bStart,
				bLength: bEnd - bStart,
				bContent: b.slice(bStart, bEnd),
			});
		}

		currOffset = regionEnd;
	}

	advanceTo(o.length);

	return results;
};
