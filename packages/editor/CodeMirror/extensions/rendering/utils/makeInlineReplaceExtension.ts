// Ref: https://codemirror.net/examples/bundle/
// and  https://codemirror.net/examples/decoration/

import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { ReplacementExtension } from '../types';
import nodeIntersectsSelection from './nodeIntersectsSelection';


export const makeInlineReplaceExtension = (extensionSpec: ReplacementExtension) => ViewPlugin.fromClass(class {
	public decorations: DecorationSet;

	public constructor(view: EditorView) {
		this.updateDecorations(view);
	}

	private updateDecorations(view: EditorView) {
		const doc = view.state.doc;
		const cursorLine = doc.lineAt(view.state.selection.main.anchor);
		const selection = view.state.selection;

		const parentTagCounts = new Map<string, number>();
		const decorateNode = (node: SyntaxNodeRef) => {
			const widgetOrDecoration = extensionSpec.createDecoration(node, view.state, parentTagCounts);
			let decoration;
			if (widgetOrDecoration instanceof WidgetType) {
				decoration = Decoration.replace({
					widget: widgetOrDecoration,
				});
			} else if (widgetOrDecoration instanceof Decoration) {
				decoration = widgetOrDecoration;
			}

			if (decoration) {
				const range = extensionSpec.getDecorationRange?.(node, view.state) ?? [node.from, node.to];
				const rangeLineFrom = doc.lineAt(range[0]);
				const rangeLineTo = range.length === 2 ? doc.lineAt(range[1]) : rangeLineFrom;

				// A different start/end line causes errors.
				if (rangeLineFrom.number === rangeLineTo.number) {
					if (range.length === 1) {
						widgets.push(decoration.range(range[0]));
					} else {
						widgets.push(decoration.range(range[0], range[1]));
					}
				}
			}
		};

		const widgets: Range<Decoration>[] = [];
		for (const { from, to } of view.visibleRanges) {
			parentTagCounts.clear();
			syntaxTree(view.state).iterate({
				from, to,
				enter: node => {
					parentTagCounts.set(node.name, (parentTagCounts.get(node.name) ?? 0) + 1);

					const nodeLineFrom = doc.lineAt(node.from);
					const nodeLineTo = doc.lineAt(node.from);
					const nodeLineContainsSelection = cursorLine.number === nodeLineFrom.number || cursorLine.number === nodeLineTo.number;
					const shouldHide = (
						(extensionSpec.hideWhenContainsSelection ?? true) && (
							nodeIntersectsSelection(selection, node) || nodeLineContainsSelection
						)
					);

					if (!shouldHide) {
						decorateNode(node);
					}
				},
				leave: node => {
					parentTagCounts.set(node.name, (parentTagCounts.get(node.name) ?? 0) - 1);
				},
			});
		}
		this.decorations = Decoration.set(widgets, true);
	}

	public update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged || update.selectionSet) {
			this.updateDecorations(update.view);
		}
	}
}, {
	decorations: view => view.decorations,
});

export default makeInlineReplaceExtension;
