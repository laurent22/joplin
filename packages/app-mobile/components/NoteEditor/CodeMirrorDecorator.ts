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

const mathBlockDecoration = Decoration.line({
	attributes: { class: 'cm-mathBlock' },
});

const blockQuoteDecoration = Decoration.line({
	attributes: { class: 'cm-blockQuote' },
});

// Returns a set of [Decoration]s, associated with block syntax groups that require
// full-line styling.
function lineDecoration(view: EditorView) {
	const decorations: { pos: number; decoration: Decoration }[] = [];

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

	for (const { from, to } of view.visibleRanges) {
		ensureSyntaxTree(
			view.state,
			to
		)?.iterate({
			from, to,
			enter: node => {
				let decorated = false;

				// Compute the visible region of the node.
				const viewFrom = Math.max(from, node.from);
				const viewTo = Math.min(to, node.to);

				switch (node.name) {
				case 'FencedCode':
				case 'CodeBlock':
					addDecorationToLines(viewFrom, viewTo, codeBlockDecoration);
					decorated = true;
					break;
				case 'BlockMath':
					addDecorationToLines(viewFrom, viewTo, mathBlockDecoration);
					decorated = true;
					break;
				case 'Blockquote':
					addDecorationToLines(viewFrom, viewTo, blockQuoteDecoration);
					decorated = true;
					break;
				}

				if (decorated) {
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
	for (const { pos, decoration } of decorations) {
		decorationBuilder.add(pos, pos, decoration);
	}
	return decorationBuilder.finish();
}

const decoratorPlugin = ViewPlugin.fromClass(class {
	public decorations: DecorationSet;

	public constructor(view: EditorView) {
		this.decorations = lineDecoration(view);

	}

	public update(viewUpdate: ViewUpdate) {
		// TODO: If decorations that are invisible when the focus is near, this
		// may need to be updated more often:
		if (viewUpdate.docChanged || viewUpdate.viewportChanged) {
			this.decorations = lineDecoration(viewUpdate.view);
		}
	}
}, {
	decorations: pluginVal => pluginVal.decorations,
});

export default decoratorPlugin;
