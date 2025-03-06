import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const autoTextDirectionDecoration = Decoration.line({
	attributes: { dir: 'auto' },
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
];

export default biDirectionalTextExtension;
