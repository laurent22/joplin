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

const blockQuoteDecoration = Decoration.line({
	attributes: { class: 'cm-blockQuote' },
});

const headerLineDecoration = Decoration.line({
	attributes: { class: 'cm-headerLine' },
});

type DecorationDescription = { pos: number; length?: number; decoration: Decoration };

// Returns a set of [Decoration]s, associated with block syntax groups that require
// full-line styling.
const computeDecorations = (view: EditorView) => {
	const decorations: DecorationDescription[] = [];

	// Add a decoration to all lines between the document position [from] up to
	// and includeing the position [to].
	const addDecorationToLines = (from: number, to: number, decoration: Decoration) => {
		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			decorations.push({
				pos: line.from,
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

				switch (node.name) {
				case 'FencedCode':
				case 'CodeBlock':
					addDecorationToLines(viewFrom, viewTo, codeBlockDecoration);
					blockDecorated = true;
					break;
				case 'BlockMath':
					addDecorationToLines(viewFrom, viewTo, mathBlockDecoration);
					blockDecorated = true;
					break;
				case 'Blockquote':
					addDecorationToLines(viewFrom, viewTo, blockQuoteDecoration);
					blockDecorated = true;
					break;
				case 'InlineMath':
					addDecorationToRange(viewFrom, viewTo, inlineMathDecoration);
					break;
				case 'InlineCode':
					addDecorationToRange(viewFrom, viewTo, inlineCodeDecoration);
					break;
				case 'URL':
					addDecorationToRange(viewFrom, viewTo, urlDecoration);
					break;
				case 'SetextHeading1':
				case 'SetextHeading2':
				case 'ATXHeading1':
				case 'ATXHeading2':
				case 'ATXHeading3':
				case 'ATXHeading4':
				case 'ATXHeading5':
				case 'ATXHeading6':
					addDecorationToLines(viewFrom, viewTo, headerLineDecoration);
					break;
				case 'HTMLTag':
				case 'TagName':
					addDecorationToRange(viewFrom, viewTo, htmlTagNameDecoration);
					break;
				}

				// Only block decorations will have differing first and last lines
				if (blockDecorated) {
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

	decorations.sort((a, b) => a.pos - b.pos);

	// Items need to be added to a RangeSetBuilder in ascending order
	const decorationBuilder = new RangeSetBuilder<Decoration>();
	for (const { pos, length, decoration } of decorations) {
		// Null length => entire line
		decorationBuilder.add(pos, pos + (length ?? 0), decoration);
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
