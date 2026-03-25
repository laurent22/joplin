import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, Direction, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const autoTextDirectionDecoration = Decoration.line({
	attributes: { dir: 'auto' },
});
const bidiIsolateOpenerRegex = /[\u2066-\u2068]/g;

const bidiIsolateDirections: Record<number, Direction | null> = {
	0x2066: Direction.LTR,
	0x2067: Direction.RTL,
	0x2068: null,
};

class BidiIsolatePlugin {
	public isolatedRanges: DecorationSet;

	public constructor(view: EditorView) {
		this.isolatedRanges = this.buildRanges(view);
	}

	public update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.isolatedRanges = this.buildRanges(update.view);
		}
	}

	private buildRanges(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		for (const { from, to } of view.visibleRanges) {
			const text = view.state.doc.sliceString(from, to);
			bidiIsolateOpenerRegex.lastIndex = 0;
			let match;
			while ((match = bidiIsolateOpenerRegex.exec(text)) !== null) {
				const pos = from + match.index;
				const codePoint = match[0].codePointAt(0)!;
				builder.add(pos, pos + 1, Decoration.mark({ bidiIsolate: bidiIsolateDirections[codePoint] }));
			}
		}
		return builder.finish();
	}
}

const bidiIsolatePlugin = ViewPlugin.fromClass(BidiIsolatePlugin, {
	provide: plugin => EditorView.bidiIsolatedRanges.of(
		(view: EditorView) => view.plugin(plugin)?.isolatedRanges ?? Decoration.none,
	),
});

const biDirectionalTextExtension: Extension = [
	EditorView.perLineTextDirection.of(true),
	ViewPlugin.fromClass(class {
		public decorations: DecorationSet;
		public constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		public update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		private buildDecorations(view: EditorView) {
			const builder = new RangeSetBuilder<Decoration>();
			for (const { from, to } of view.visibleRanges) {
				const fromLine = view.state.doc.lineAt(from);
				const toLine = view.state.doc.lineAt(to);

				for (let i = fromLine.number; i <= toLine.number; i++) {
					const line = view.state.doc.line(i);
					if (line.text) {
						builder.add(line.from, line.from, autoTextDirectionDecoration);
					}
				}
			}
			return builder.finish();
		}
	}, { decorations: v => v.decorations }),
	bidiIsolatePlugin,
];

export default biDirectionalTextExtension;
