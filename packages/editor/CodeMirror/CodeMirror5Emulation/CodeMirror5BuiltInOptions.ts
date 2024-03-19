import { Compartment, Extension, RangeSetBuilder, StateEffect } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const activeLineDecoration = Decoration.line({ class: 'CodeMirror-activeline CodeMirror-activeline-background' });

const optionToExtension: Record<string, Extension> = {
	'styleActiveLine': [
		ViewPlugin.fromClass(class {
			public decorations: DecorationSet;

			public constructor(view: EditorView) {
				this.updateDecorations(view);
			}

			public update(update: ViewUpdate) {
				this.updateDecorations(update.view);
			}

			private updateDecorations(view: EditorView) {
				const builder = new RangeSetBuilder<Decoration>();
				let lastLine = -1;

				for (const selection of view.state.selection.ranges) {
					const startLine = selection.from;
					const line = view.state.doc.lineAt(startLine);

					if (line.number !== lastLine) {
						builder.add(line.from, line.from, activeLineDecoration);
					}

					lastLine = line.number;
				}

				this.decorations = builder.finish();
			}
		}, {
			decorations: plugin => plugin.decorations,
		}),
		EditorView.baseTheme({
			'&dark .CodeMirror-activeline-background': {
				background: '#3304',
				color: 'white',
			},
			'&light .CodeMirror-activeline-background': {
				background: '#7ff4',
				color: 'black',
			},
		}),
	],
};

// Maps several CM5 options to CM6 extensions
export default class CodeMirror5BuiltInOptions {
	private activeOptions: string[] = [];
	private extensionCompartment: Compartment = new Compartment();

	public constructor(private editor: EditorView) {
		editor.dispatch({
			effects: StateEffect.appendConfig.of(this.extensionCompartment.of([])),
		});
	}

	private updateExtensions() {
		const extensions = this.activeOptions.map(option => optionToExtension[option]);
		this.editor.dispatch({
			effects: this.extensionCompartment.reconfigure(extensions),
		});
	}

	public supportsOption(option: string) {
		return optionToExtension.hasOwnProperty(option);
	}

	public setOption(optionName: string, value: boolean) {
		this.activeOptions = this.activeOptions.filter(other => other !== optionName);

		if (value) {
			this.activeOptions.push(optionName);
		}

		this.updateExtensions();
	}
}
