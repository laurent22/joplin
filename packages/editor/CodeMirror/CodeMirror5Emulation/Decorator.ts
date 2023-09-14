
// Handles adding decorations to the CodeMirror editor -- converts CodeMirror5-style calls
// to input accepted by CodeMirror 6

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { ChangeDesc, Extension, Range, RangeSetBuilder, StateEffect } from '@codemirror/state';
import { StreamParser, StringStream, indentUnit } from '@codemirror/language';

interface DecorationRange {
	from: number;
	to: number;
}

const mapRangeConfig = {
	// Updates a range based on some change to the document
	map: <T extends DecorationRange> (range: T, change: ChangeDesc): T => {
		const from = change.mapPos(range.from);
		const to = change.mapPos(range.to);
		return {
			...range,
			from: Math.min(from, to),
			to: Math.max(from, to),
		};
	},
};

interface LineCssDecorationSpec extends DecorationRange {
	cssClass: string;
}

const addLineDecorationEffect = StateEffect.define<LineCssDecorationSpec>(mapRangeConfig);
const removeLineDecorationEffect = StateEffect.define<LineCssDecorationSpec>(mapRangeConfig);
const addMarkDecorationEffect = StateEffect.define<LineCssDecorationSpec>(mapRangeConfig);
// TODO:
// const removeMarkDecorationEffect = StateEffect.define<LineDecorationSpec>(mapRangeConfig);

export interface LineWidgetOptions {
	className?: string;
	above?: boolean;
}

interface LineWidgetDecorationSpec extends DecorationRange {
	element: HTMLElement;
	options: LineWidgetOptions;
}
const addLineWidgetEffect = StateEffect.define<LineWidgetDecorationSpec>(mapRangeConfig);
const removeLineWidgetEffect = StateEffect.define<{ element: HTMLElement }>();


class WidgetDecorationWrapper extends WidgetType {
	public constructor(
		public readonly element: HTMLElement,
		public readonly options: LineWidgetOptions,
	) {
		super();
	}

	public override toDOM() {
		const container = document.createElement('div');
		this.element.remove();
		container.appendChild(this.element);

		if (this.options.className) {
			container.classList.add(this.options.className);
		}

		return container;
	}
}

interface LineWidgetControl {
	node: HTMLElement;
	clear(): void;
	changed(): void;
	className?: string;
}

export default class Decorator {
	private _extension: Extension;
	private _effectDecorations: DecorationSet = Decoration.none;

	private constructor(private editor: EditorView) {
		const decorator = this;
		this._extension = [
			// Overlay decorations -- recreate all decorations when the editor changes
			// (overlay decorations require parsing the document and may change output
			// when the editor/view changes.)
			ViewPlugin.fromClass(class {
				public decorations: DecorationSet;

				public constructor(view: EditorView) {
					this.decorations = decorator.createOverlayDecorations(view);
				}

				public update(update: ViewUpdate) {
					if (update.viewportChanged || update.docChanged) {
						this.decorations = decorator.createOverlayDecorations(update.view);
					}
				}
			}, {
				decorations: v => v.decorations,
			}),

			// Other decorations based on effects. See the
			// decoration examples: https://codemirror.net/examples/decoration/
			ViewPlugin.fromClass(class {
				public update(update: ViewUpdate) {
					decorator.updateEffectDecorations(update);
				}
			}, {
				decorations: _ => decorator._effectDecorations,
			}),
		];
	}

	public static create(editor: EditorView) {
		const decorator = new Decorator(editor);

		return { decorator, extension: decorator._extension };
	}

	private _decorationCache: Record<string, Decoration> = Object.create(null);
	private _overlays: (StreamParser<any>)[] = [];

	private classNameToCssDecoration(className: string, isLineDecoration: boolean) {
		let decoration;

		if (className in this._decorationCache) {
			decoration = this._decorationCache[className];
		} else {
			const attributes = { class: className };

			if (isLineDecoration) {
				decoration = Decoration.line({ attributes });
			} else {
				decoration = Decoration.mark({ attributes });
			}

			this._decorationCache[className] = decoration;
		}

		return decoration;
	}

	private updateEffectDecorations(update: ViewUpdate) {
		const transactions = update.transactions;
		let decorations = this._effectDecorations;

		// Update decoration positions
		for (const transaction of transactions) {
			decorations = decorations.map(transaction.changes);

			// Add or remove decorations
			for (const effect of transaction.effects) {
				const isMarkDecoration = effect.is(addMarkDecorationEffect);
				const isLineDecoration = effect.is(addLineDecorationEffect);
				if (isMarkDecoration || isLineDecoration) {
					const decoration = this.classNameToCssDecoration(
						effect.value.cssClass, isLineDecoration,
					);

					decorations = decorations.update({
						add: [decoration.range(effect.value.from, effect.value.to)],
					});
				} else if (effect.is(removeLineDecorationEffect)) {
					const doc = transaction.state.doc;
					const targetFrom = doc.lineAt(effect.value.from).from;
					const targetTo = doc.lineAt(effect.value.to).to;

					const targetDecoration = this.classNameToCssDecoration(effect.value.cssClass, true);

					decorations = decorations.update({
						// Returns true only for decorations that should be kept.
						filter: (from, to, value) => {
							if (from >= targetFrom && to <= targetTo && value.eq(targetDecoration)) {
								return false;
							}

							return true;
						},
					});
				} else if (effect.is(addLineWidgetEffect)) {
					const options = effect.value.options;
					const decoration = Decoration.widget({
						widget: new WidgetDecorationWrapper(effect.value.element, options),
					});

					decorations = decorations.update({
						add: [decoration.range(options.above ? effect.value.from : effect.value.to)],
					});
				} else if (effect.is(removeLineWidgetEffect)) {
					decorations = decorations.update({
						// Returns true only for decorations that should be kept.
						filter: (_from, _to, value) => {
							return value.spec.widget.element !== effect.value.element;
						},
					});
				}
			}
		}

		this._effectDecorations = decorations;
	}

	private createOverlayDecorations(view: EditorView): DecorationSet {
		const makeDecoration = (
			tokenName: string, start: number, stop: number,
		) => {
			const isLineDecoration = tokenName.startsWith('line-');

			// CM5 prefixes class names with cm-
			tokenName = `cm-${tokenName}`;

			const decoration = this.classNameToCssDecoration(tokenName, isLineDecoration);
			return decoration.range(start, stop);
		};

		const indentSize = view.state.facet(indentUnit).length;
		const newDecorations: Range<Decoration>[] = [];

		for (const overlay of this._overlays) {
			const state = overlay.startState?.(indentSize) ?? {};

			for (const { from, to } of view.visibleRanges) {
				const fromLine = view.state.doc.lineAt(from);
				const toLine = view.state.doc.lineAt(to);

				const fromLineNumber = fromLine.number;
				const toLineNumber = toLine.number;

				for (let i = fromLineNumber; i <= toLineNumber; i++) {
					const line = view.state.doc.line(i);

					const reader = new StringStream(
						line.text,
						view.state.tabSize,
						indentSize,
					);
					let lastPos = 0;

					(reader as any).baseToken ??= (): null => null;

					while (!reader.eol()) {
						const token = overlay.token(reader, state);

						if (token) {
							for (const className of token.split(/\s+/)) {
								if (className.startsWith('line-')) {
									newDecorations.push(makeDecoration(className, line.from, line.from));
								} else {
									const from = lastPos + line.from;
									const to = reader.pos + line.from;
									newDecorations.push(makeDecoration(className, from, to));
								}
							}
						}

						if (reader.pos === lastPos) {
							throw new Error(
								'Mark decoration position did not increase -- overlays must advance with each call to .token()',
							);
						}

						lastPos = reader.pos;
					}
				}
			}
		}

		// Required by CodeMirror:
		// Should be sorted by from position, then by length.
		newDecorations.sort((a, b) => {
			if (a.from !== b.from) {
				return a.from - b.from;
			}

			return a.to - b.to;
		});

		// Per the documentation, new tokens should be added in
		// increasing order.
		const decorations = new RangeSetBuilder<Decoration>();

		for (const decoration of newDecorations) {
			decorations.add(decoration.from, decoration.to, decoration.value);
		}

		return decorations.finish();
	}

	public addOverlay<State>(modeObject: StreamParser<State>) {
		this._overlays.push(modeObject);
	}

	private addRemoveLineClass(lineNumber: number, className: string, add: boolean) {
		// + 1: Convert from zero-indexed to one-indexed
		const line = this.editor.state.doc.line(lineNumber + 1);

		const effect = add ? addLineDecorationEffect : removeLineDecorationEffect;
		this.editor.dispatch({
			effects: effect.of({
				cssClass: className,
				from: line.from,
				to: line.to,
			}),
		});
	}

	public addLineClass(lineNumber: number, _where: string, className: string) {
		this.addRemoveLineClass(lineNumber, className, true);
	}

	public removeLineClass(lineNumber: number, _where: string, className: string) {
		this.addRemoveLineClass(lineNumber, className, false);
	}

	public getLineClasses(lineNumber: number) {
		const line = this.editor.state.doc.line(lineNumber + 1);
		const lineClasses: string[] = [];

		this._effectDecorations.between(line.from, line.to, (from, to, decoration) => {
			if (from === line.from && to === line.to) {
				const className = decoration.spec?.class;
				if (typeof className === 'string') {
					lineClasses.push(className);
				}
			}
		});

		return lineClasses;
	}

	private createLineWidgetControl(node: HTMLElement, options: LineWidgetOptions): LineWidgetControl {
		return {
			node,
			clear: () => {
				this.editor.dispatch({
					effects: removeLineWidgetEffect.of({ element: node }),
				});
			},
			changed: () => {
				this.editor.requestMeasure();
			},
			className: options.className,
		};
	}

	public getLineWidgets(lineNumber: number): LineWidgetControl[] {
		const line = this.editor.state.doc.line(lineNumber + 1);
		const lineWidgets: LineWidgetControl[] = [];

		this._effectDecorations.between(line.from, line.to, (from, to, decoration) => {
			if (from >= line.from && from <= line.to && from === to) {
				const widget = decoration.spec?.widget;
				if (widget && widget instanceof WidgetDecorationWrapper) {
					lineWidgets.push(this.createLineWidgetControl(widget.element, widget.options));
				}
			}
		});

		return lineWidgets;
	}

	public addLineWidget(lineNumber: number, node: HTMLElement, options: LineWidgetOptions): LineWidgetControl {
		const line = this.editor.state.doc.line(lineNumber + 1);

		const lineWidgetOptions = {
			from: line.from,
			to: line.to,
			element: node,
			options,
		};
		this.editor.dispatch({
			effects: addLineWidgetEffect.of(lineWidgetOptions),
		});

		return this.createLineWidgetControl(node, options);
	}
}
