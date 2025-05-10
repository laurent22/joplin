//
// Exports an editor plugin that creates multi-line decorations based on the
// editor's syntax tree (assumes markdown).
//
// For more about creating decorations, see https://codemirror.net/examples/zebra/
//

import { Decoration, EditorView } from '@codemirror/view';
import { ViewPlugin, DecorationSet, ViewUpdate } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';

const regionStartDecoration = Decoration.line({
	attributes: { class: 'cm-regionFirstLine' },
});

const regionStopDecoration = Decoration.line({
	attributes: { class: 'cm-regionLastLine' },
});

const noSpellCheckAttrs = { spellcheck: 'false', autocorrect: 'false' };

const codeBlockDecoration = Decoration.line({
	attributes: { class: 'cm-codeBlock', ...noSpellCheckAttrs },
});

const inlineCodeDecoration = Decoration.mark({
	attributes: { class: 'cm-inlineCode', ...noSpellCheckAttrs },
});

const mathBlockDecoration = Decoration.line({
	attributes: { class: 'cm-mathBlock', ...noSpellCheckAttrs },
});

const inlineMathDecoration = Decoration.mark({
	attributes: { class: 'cm-inlineMath', ...noSpellCheckAttrs },
});

const urlDecoration = Decoration.mark({
	attributes: { class: 'cm-url', ...noSpellCheckAttrs },
});

const htmlTagNameDecoration = Decoration.mark({
	attributes: { class: 'cm-htmlTag', ...noSpellCheckAttrs },
});

const markDecoration = Decoration.mark({
	attributes: { class: 'cm-highlighted' },
});

const blockQuoteDecoration = Decoration.line({
	attributes: { class: 'cm-blockQuote' },
});

const header1LineDecoration = Decoration.line({
	attributes: { class: 'cm-h1 cm-headerLine cm-header' },
});

const header2LineDecoration = Decoration.line({
	attributes: { class: 'cm-h2 cm-headerLine cm-header' },
});

const header3LineDecoration = Decoration.line({
	attributes: { class: 'cm-h3 cm-headerLine cm-header' },
});

const header4LineDecoration = Decoration.line({
	attributes: { class: 'cm-h4 cm-headerLine cm-header' },
});

const header5LineDecoration = Decoration.line({
	attributes: { class: 'cm-h5 cm-headerLine cm-header' },
});

const header6LineDecoration = Decoration.line({
	attributes: { class: 'cm-h6 cm-headerLine cm-header' },
});

const tableHeaderDecoration = Decoration.line({
	attributes: { class: 'cm-tableHeader' },
});

const tableBodyDecoration = Decoration.line({
	attributes: { class: 'cm-tableRow' },
});

const tableDelimiterDecoration = Decoration.line({
	attributes: { class: 'cm-tableDelimiter' },
});

const orderedListDecoration = Decoration.line({
	attributes: { class: 'cm-orderedList' },
});

const unorderedListDecoration = Decoration.line({
	attributes: { class: 'cm-unorderedList' },
});

const listItemDecoration = Decoration.line({
	attributes: { class: 'cm-listItem' },
});

const horizontalRuleDecoration = Decoration.mark({
	attributes: { class: 'cm-hr' },
});

const taskMarkerDecoration = Decoration.mark({
	attributes: { class: 'cm-taskMarker' },
});

const strikethroughDecoration = Decoration.mark({
	attributes: { class: 'cm-strike' },
});

const nodeNameToLineDecoration: Record<string, Decoration> = {
	'FencedCode': codeBlockDecoration,
	'CodeBlock': codeBlockDecoration,
	'BlockMath': mathBlockDecoration,
	'Blockquote': blockQuoteDecoration,
	'OrderedList': orderedListDecoration,
	'BulletList': unorderedListDecoration,

	'ListItem': listItemDecoration,

	'SetextHeading1': header1LineDecoration,
	'ATXHeading1': header1LineDecoration,
	'SetextHeading2': header2LineDecoration,
	'ATXHeading2': header2LineDecoration,
	'ATXHeading3': header3LineDecoration,
	'ATXHeading4': header4LineDecoration,
	'ATXHeading5': header5LineDecoration,
	'ATXHeading6': header6LineDecoration,

	'TableHeader': tableHeaderDecoration,
	'TableDelimiter': tableDelimiterDecoration,
	'TableRow': tableBodyDecoration,
};

const nodeNameToMarkDecoration: Record<string, Decoration> = {
	'InlineCode': inlineCodeDecoration,
	'URL': urlDecoration,
	'InlineMath': inlineMathDecoration,
	'HTMLTag': htmlTagNameDecoration,
	'TagName': htmlTagNameDecoration,
	'HorizontalRule': horizontalRuleDecoration,
	'TaskMarker': taskMarkerDecoration,
	'Strikethrough': strikethroughDecoration,
	'Highlight': markDecoration,
};

const multilineNodes = {
	'FencedCode': true,
	'CodeBlock': true,
	'BlockMath': true,
	'Blockquote': true,
	'OrderedList': true,
	'BulletList': true,
};

type DecorationDescription = { pos: number; length: number; decoration: Decoration };

// Returns a set of [Decoration]s, associated with block syntax groups that require
// full-line styling.
const computeDecorations = (view: EditorView) => {
	const decorations: DecorationDescription[] = [];

	// Add a decoration to all lines between the document position [from] up to
	// and including the position [to].
	const addDecorationToLines = (from: number, to: number, decoration: Decoration) => {
		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			decorations.push({
				pos: line.from,
				length: 0,
				decoration,
			});

			// Move to the next line
			pos = line.to + 1;
		}
	};

	const addDecorationToRange = (from: number, to: number, decoration: Decoration) => {
		decorations.push({
			pos: from,
			length: to - from,
			decoration,
		});
	};

	for (const { from, to } of view.visibleRanges) {
		ensureSyntaxTree(
			view.state,
			to,
		)?.iterate({
			from, to,
			enter: node => {
				let blockDecorated = false;

				// Compute the visible region of the node.
				const viewFrom = Math.max(from, node.from);
				const viewTo = Math.min(to, node.to);

				if (nodeNameToLineDecoration.hasOwnProperty(node.name)) {
					const decoration = nodeNameToLineDecoration[node.name];
					addDecorationToLines(viewFrom, viewTo, decoration);
					blockDecorated = true;
				}

				if (nodeNameToMarkDecoration.hasOwnProperty(node.name)) {
					const decoration = nodeNameToMarkDecoration[node.name];
					addDecorationToRange(viewFrom, viewTo, decoration);
				}

				// Only certain block decorations will have differing first and last lines
				if (blockDecorated && multilineNodes.hasOwnProperty(node.name)) {
					// Allow different styles for the first, last lines in a block.
					if (viewFrom === node.from) {
						addDecorationToLines(viewFrom, viewFrom, regionStartDecoration);
					}

					if (viewTo === node.to) {
						addDecorationToLines(viewTo, viewTo, regionStopDecoration);
					}
				}
			},
		});
	}

	// Decorations need to be sorted in ascending order first by start position,
	// then by length. Adding items to the RangeSetBuilder in an incorrect order
	// causes an exception to be thrown.
	decorations.sort((a, b) => {
		const posComparison = a.pos - b.pos;
		if (posComparison !== 0) {
			return posComparison;
		}

		const lengthComparison = a.length - b.length;
		return lengthComparison;
	});

	const decorationBuilder = new RangeSetBuilder<Decoration>();
	for (const { pos, length, decoration } of decorations) {
		// Zero length => entire line
		decorationBuilder.add(pos, pos + length, decoration);
	}
	return decorationBuilder.finish();
};

const decoratorExtension = ViewPlugin.fromClass(class {
	public decorations: DecorationSet;

	public constructor(view: EditorView) {
		this.decorations = computeDecorations(view);
	}

	public update(viewUpdate: ViewUpdate) {
		if (viewUpdate.docChanged || viewUpdate.viewportChanged) {
			this.decorations = computeDecorations(viewUpdate.view);
		}
	}
}, {
	decorations: pluginVal => pluginVal.decorations,
});

export default decoratorExtension;
