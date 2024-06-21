import { Text as DocumentText, SelectionRange } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';

export enum MatchSide {
	Start,
	End,
}

// Returns the length of a match for this in the given selection,
// -1 if no match is found.
const findInlineMatch = (
	doc: DocumentText, spec: RegionSpec, sel: SelectionRange, side: MatchSide,
): number => {
	const [regex, template] = (() => {
		if (side === MatchSide.Start) {
			return [spec.matcher.start, spec.template.start];
		} else {
			return [spec.matcher.end, spec.template.end];
		}
	})();
	const [startIndex, endIndex] = (() => {
		if (!sel.empty) {
			return [sel.from, sel.to];
		}

		const bufferSize = template.length;
		if (side === MatchSide.Start) {
			return [sel.from - bufferSize, sel.to];
		} else {
			return [sel.from, sel.to + bufferSize];
		}
	})();
	const searchText = doc.sliceString(startIndex, endIndex);

	// Returns true if [idx] is in the right place (the match is at
	// the end of the string or the beginning based on startIndex/endIndex).
	const indexSatisfies = (idx: number, len: number): boolean => {
		idx += startIndex;
		if (side === MatchSide.Start) {
			return idx === startIndex;
		} else {
			return idx + len === endIndex;
		}
	};

	if (!regex.global) {
		throw new Error('Regular expressions used by RegionSpec must have the global flag! This flag is required to find multiple matches.');
	}

	// Search from the beginning.
	regex.lastIndex = 0;

	let foundMatch: RegExpMatchArray|null = null;
	let match: RegExpMatchArray|null;
	while ((match = regex.exec(searchText)) !== null) {
		if (indexSatisfies(match.index ?? -1, match[0].length)) {
			foundMatch = match;
			break;
		}
	}

	if (foundMatch) {
		const matchLength = foundMatch[0].length;
		const matchIndex = foundMatch.index;

		// If the match isn't in the right place,
		if (indexSatisfies(matchIndex, matchLength)) {
			return matchLength;
		}
	}

	return -1;
};

export default findInlineMatch;

