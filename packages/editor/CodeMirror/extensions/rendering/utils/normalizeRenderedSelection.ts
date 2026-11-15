// cspell:ignore assoc
import { EditorSelection } from '@codemirror/state';

// A hidden source range and the rendered construct it belongs to. Keep this
// information separate from decorations, which may merge adjacent markers.
export interface HiddenSyntaxRange {
	from: number;
	to: number;
	ownerFrom: number;
	ownerTo: number;
}

const normalizeRenderedSelection = (selection: EditorSelection, hiddenSyntax: readonly HiddenSyntaxRange[]) => {
	if (!hiddenSyntax.length || selection.ranges.every(range => range.empty)) return selection;

	const hidden: { from: number; to: number }[] = [];
	for (const range of [...hiddenSyntax].sort((a, b) => a.from - b.from)) {
		const previous = hidden[hidden.length - 1];
		if (previous && range.from <= previous.to) {
			previous.to = Math.max(previous.to, range.to);
		} else {
			hidden.push({ from: range.from, to: range.to });
		}
	}

	let changed = false;
	const ranges = selection.ranges.map(range => {
		if (range.empty) return range;

		// Drop hidden syntax at the edges first: hit testing can land on either side
		// of a merged run like the "***" in **one***two*, picking up a neighbour's marks.
		const visibleFrom = hidden.find(hidden => hidden.from <= range.from && hidden.to > range.from)?.to ?? range.from;
		const visibleTo = hidden.find(hidden => hidden.from < range.to && hidden.to >= range.to)?.from ?? range.to;
		if (visibleFrom >= visibleTo) return range;

		let from = visibleFrom;
		let to = visibleTo;
		for (const { ownerFrom, ownerTo } of hiddenSyntax) {
			if (ownerFrom >= visibleTo || ownerTo <= visibleFrom) continue;
			if (ownerFrom >= from && ownerTo <= to) continue;

			// Trim *all* hidden syntax at the owner's edges, including nested
			// constructs. Only expand when all remaining visible content is selected.
			const prefix = hidden.find(hidden => hidden.from <= ownerFrom && hidden.to > ownerFrom);
			const suffix = hidden.find(hidden => hidden.from < ownerTo && hidden.to >= ownerTo);
			const contentFrom = prefix ? Math.min(prefix.to, ownerTo) : ownerFrom;
			const contentTo = suffix ? Math.max(suffix.from, ownerFrom) : ownerTo;
			if (contentFrom < contentTo && visibleFrom <= contentFrom && visibleTo >= contentTo) {
				from = Math.min(from, ownerFrom);
				to = Math.max(to, ownerTo);
			}
		}

		if (from === range.from && to === range.to) return range;
		changed = true;
		const forward = range.anchor <= range.head;
		return EditorSelection.range(forward ? from : to, forward ? to : from, range.goalColumn, range.bidiLevel ?? undefined, range.assoc);
	});
	return changed ? EditorSelection.create(ranges, selection.mainIndex) : selection;
};

export default normalizeRenderedSelection;
