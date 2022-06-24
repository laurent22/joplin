// Handles multi-line decorations.
// Exports a CodeMirror6 plugin.
//
// Ref:
//  • https://codemirror.net/examples/zebra/

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

const codeBlockDecoration = Decoration.line({
	attributes: { class: 'cm-codeBlock' },
});

const inlineCodeDecoration = Decoration.mark({
	attributes: { class: 'cm-inlineCode' },
});

const mathBlockDecoration = Decoration.line({
	attributes: { class: 'cm-mathBlock' },
});

const inlineMathDecoration = Decoration.mark({
	attributes: { class: 'cm-inlineMath' },
});

const blockQuoteDecoration = Decoration.line({
	attributes: { class: 'cm-blockQuote' },
});

// Returns a set of [Decoration]s, associated with block syntax groups that require
// full-line styling.
function computeDecorations(view: EditorView) {
	const decorations: { pos: number; length?: number; decoration: Decoration }[] = [];

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
			to
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
				}

				if (blockDecorated) {
					// Allow different styles for the first, last lines in a block.
					if (viewFrom == node.from) {
						addDecorationToLines(viewFrom, viewFrom, regionStartDecoration);
					}

					if (viewTo == node.to) {
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
}

const decoratorPlugin = ViewPlugin.fromClass(class {
	public decorations: DecorationSet;

	public constructor(view: EditorView) {
		this.decorations = computeDecorations(view);
	}

	public update(viewUpdate: ViewUpdate) {
		// TODO: If decorations that are invisible when the focus is near, this
		// may need to be updated more often:
		if (viewUpdate.docChanged || viewUpdate.viewportChanged) {
			this.decorations = computeDecorations(viewUpdate.view);
		}
	}
}, {
	decorations: pluginVal => pluginVal.decorations,
});

export default decoratorPlugin;
