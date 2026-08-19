import { EditorState, RangeSet, Range, RangeValue, StateField, Text } from '@codemirror/state';

class ReferenceLinkValue extends RangeValue {
	public constructor(public readonly key: string, public readonly value: string) {
		super();
	}
}

export const resolveReferenceById = (referenceId: string, state: EditorState) => {
	const cursor = state.field(referenceLinkStateField).iter();
	for (; cursor.value; cursor.next()) {
		if (cursor.value.key === referenceId) {
			return cursor.value.value;
		}
	}

	return null;
};

const referenceLinkExp = /^(\[[^\]]+\])\s*(\[[^\]]+\])?$/;

export const isReferenceLink = (link: string) => {
	return !!link.trim().match(referenceLinkExp);
};

export const resolveReferenceFromLink = (link: string, state: EditorState) => {
	const referenceMatch = link.trim().match(referenceLinkExp);
	if (!referenceMatch) return null;

	const resolved = resolveReferenceById(referenceMatch[2] ?? referenceMatch[1], state);
	return resolved?.trim() ?? null;
};


// Returns the key and value for a link reference definition in the form
// [a test]: http://some/def/here/
const parseReferenceDef = (lineText: string) => {
	const linkStart = lineText.match(/^(\[[^[\]]+\]):/);
	if (!linkStart) return null;

	const key = linkStart[1];
	return {
		key,
		value: lineText.substring(linkStart[0].length),
	};
};

const addReferencesToSet = (set: RangeSet<ReferenceLinkValue>, fromIdx: number, toIdx: number, doc: Text) => {
	const newRanges: Range<ReferenceLinkValue>[] = [];

	const fromLine = doc.lineAt(fromIdx);
	const toLine = doc.lineAt(toIdx);

	for (let i = fromLine.number; i <= toLine.number; i++) {
		const line = doc.line(i);
		const parsedRef = parseReferenceDef(line.text);
		if (parsedRef) {
			newRanges.push(
				new ReferenceLinkValue(parsedRef.key, parsedRef.value).range(line.from),
			);
		}
	}

	return set.update({ add: newRanges });
};

const referenceLinkStateField = StateField.define<RangeSet<ReferenceLinkValue>>({
	create(state): RangeSet<ReferenceLinkValue> {
		return addReferencesToSet(RangeSet.empty, 0, state.doc.length, state.doc);
	},
	update(value, transaction) {
		if (!transaction.docChanged) return value.map(transaction.changes);

		// Remove deleted/modified definitions
		transaction.changes.iterChangedRanges((fromA, toA) => {
			value = value.update({
				filterFrom: fromA,
				filterTo: toA,
				filter: () => false,
			});
		});

		// Switch line numbers to match the new document
		value = value.map(transaction.changes);

		transaction.changes.iterChangedRanges((_fromA, _fromB, fromB, toB) => {
			value = addReferencesToSet(value, fromB, toB, transaction.newDoc);
		});

		return value;
	},
});

export default referenceLinkStateField;
