import { Text as DocumentText, EditorSelection, SelectionRange } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import { SelectionUpdate } from './types';
import toggleInlineRegionSurrounded from './toggleInlineRegionSurrounded';

const listPrefixRegex = /^(\s*(?:[-*]\s\[[ xX]\]\s|[-*]\s|\d+[.)]\s))/;

const applyChangeToText = (text: string, change: { from: number; to?: number; insert: string }) => {
	const to = change.to ?? change.from;
	return text.slice(0, change.from) + change.insert + text.slice(to);
};

const applySelectionUpdateToText = (text: string, update: SelectionUpdate) => {
	const changes = Array.isArray(update.changes) ? [...update.changes] : [];
	changes.sort((a, b) => b.from - a.from);

	let result = text;
	for (const change of changes) {
		result = applyChangeToText(result, change);
	}

	return result;
};

const toggleWholeTextRegion = (content: string, spec: RegionSpec) => {
	if (!content.trim()) return content;

	const doc = DocumentText.of([content]);
	const update = toggleInlineRegionSurrounded(doc, EditorSelection.range(0, content.length), spec);
	return applySelectionUpdateToText(content, update);
};

const toggleListLineContent = (lineText: string, spec: RegionSpec) => {
	const listPrefix = lineText.match(listPrefixRegex)?.[1];
	if (!listPrefix) return toggleWholeTextRegion(lineText, spec);

	const content = lineText.slice(listPrefix.length);
	if (!content.trim()) return lineText;

	return listPrefix + toggleWholeTextRegion(content, spec);
};

export const shouldUseMultilineInlineSelectionFormatting = (
	doc: DocumentText,
	sel: SelectionRange,
	spec: RegionSpec,
) => {
	if (sel.empty) return false;
	if (spec.nodeName !== 'StrongEmphasis' && spec.nodeName !== 'Emphasis') return false;

	const startLine = doc.lineAt(sel.from);
	const endLine = doc.lineAt(sel.to);
	if (startLine.number === endLine.number) return false;

	// Keep behavior predictable by applying this strategy only to full-line ranges.
	return sel.from === startLine.from && sel.to === endLine.to;
};

const toggleInlineMultilineSelectionFormat = (
	doc: DocumentText,
	sel: SelectionRange,
	spec: RegionSpec,
): SelectionUpdate => {
	const selectedText = doc.sliceString(sel.from, sel.to);
	const transformedText = selectedText
		.split('\n')
		.map(line => toggleListLineContent(line, spec))
		.join('\n');

	return {
		changes: [{ from: sel.from, to: sel.to, insert: transformedText }],
		range: EditorSelection.range(sel.from, sel.from + transformedText.length),
	};
};

export default toggleInlineMultilineSelectionFormat;
