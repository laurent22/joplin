import { Text, EditorSelection, EditorState, SelectionRange, ChangeSet } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import { SelectionUpdate } from './types';
import toggleInlineRegionSurrounded from './toggleInlineRegionSurrounded';
import intersectsSyntaxNode from '../isInSyntaxNode';
import { blockquotePrefixRegex, listPrefixRegex } from './markdownFormatPatterns';

const toggleWholeTextRegion = (content: string, spec: RegionSpec) => {
	if (!content.trim()) return content;

	let doc = Text.of(content.split('\n'));
	const update = toggleInlineRegionSurrounded(doc, EditorSelection.range(0, content.length), spec);

	if (update.changes) {
		const change = ChangeSet.of(update.changes, doc.length);
		doc = change.apply(doc);
	}
	return doc.toString();
};

const toggleListLineContent = (lineText: string, spec: RegionSpec) => {
	const blockquotePrefix = lineText.match(blockquotePrefixRegex)?.[1] ?? '';
	const remainingText = lineText.slice(blockquotePrefix.length);
	const listPrefix = remainingText.match(listPrefixRegex)?.[1];
	if (!listPrefix) return toggleWholeTextRegion(lineText, spec);

	const content = remainingText.slice(listPrefix.length);
	if (!content.trim()) return lineText;

	return blockquotePrefix + listPrefix + toggleWholeTextRegion(content, spec);
};

export const shouldUseMultilineInlineSelectionFormatting = (
	state: EditorState,
	sel: SelectionRange,
	spec: RegionSpec,
) => {
	if (sel.empty) return false;
	if (spec.nodeName !== 'StrongEmphasis' && spec.nodeName !== 'Emphasis') return false;
	if (intersectsSyntaxNode(state, sel, 'FencedCode') || intersectsSyntaxNode(state, sel, 'CodeBlock')) return false;

	const doc = state.doc;
	const startLine = doc.lineAt(sel.from);
	const endLine = doc.lineAt(sel.to);
	if (startLine.number === endLine.number) return false;

	// Keep behavior predictable by applying this strategy only to full-line ranges.
	return sel.from === startLine.from && sel.to === endLine.to;
};

const toggleInlineMultilineSelectionFormat = (
	state: EditorState,
	sel: SelectionRange,
	spec: RegionSpec,
): SelectionUpdate => {
	const doc = state.doc;
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
