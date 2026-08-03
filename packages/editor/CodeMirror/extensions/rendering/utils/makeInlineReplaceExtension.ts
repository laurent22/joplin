// Ref: https://codemirror.net/examples/bundle/
// and  https://codemirror.net/examples/decoration/

import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range, StateEffect } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { ReplacementExtension } from '../types';
import nodeIntersectsSelection from './nodeIntersectsSelection';

const updateInlineDecorationsEffect = StateEffect.define();

export const makeInlineReplaceExtension = (extensionSpec: ReplacementExtension) => ViewPlugin.fromClass(class {
	public decorations: DecorationSet = Decoration.set([]);
	private mouseSelectionInProgress = false;

	public constructor(private view: EditorView) {
		view.dom.addEventListener('mousedown', this.onMouseDown, true);
		view.dom.ownerDocument.addEventListener('mouseup', this.onMouseUp);
		this.updateDecorations(view);
	}

	public destroy() {
		this.view.dom.removeEventListener('mousedown', this.onMouseDown, true);
		this.view.dom.ownerDocument.removeEventListener('mouseup', this.onMouseUp);
	}

	private onMouseDown = (event: MouseEvent) => {
		if (event.button === 0) {
			this.mouseSelectionInProgress = true;
		}
	};

	private onMouseUp = () => {
		if (this.mouseSelectionInProgress) {
			// To prevent unnecessary scroll on iOS, decoration changes need to
			// happen *after* the gesture ends.
			requestAnimationFrame(() => {
				this.mouseSelectionInProgress = false;
				this.view.dispatch({
					effects: updateInlineDecorationsEffect.of(null),
				});
			});
		}
	};

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
				const range = extensionSpec.getDecorationRange?.(node, view.state, parentTagCounts) ?? [node.from, node.to];
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

		let widgets: Range<Decoration>[] = [];
		for (const { from, to } of view.visibleRanges) {
			parentTagCounts.clear();
			syntaxTree(view.state).iterate({
				from, to,
				enter: node => {
					parentTagCounts.set(node.name, (parentTagCounts.get(node.name) ?? 0) + 1);

					const strategy = extensionSpec.getRevealStrategy?.(node, view.state, parentTagCounts) ?? 'line';

					let isSelected = false;
					if (typeof strategy === 'boolean') {
						isSelected = strategy;
					} else if (strategy === 'line') {
						const nodeLine = doc.lineAt(node.from);
						const lineContainsSelection = cursorLine.number === nodeLine.number;
						isSelected = lineContainsSelection || nodeIntersectsSelection(selection, node);
					} else if (strategy === 'select') {
						isSelected = nodeIntersectsSelection(selection, node);
					} else if (strategy === 'active') {
						const parent = node.node.parent;
						isSelected = nodeIntersectsSelection(selection, node) || (!!parent && nodeIntersectsSelection(selection, parent));
					}

					const shouldHide = (
						(extensionSpec.hideWhenContainsSelection ?? true) && isSelected
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

		if (extensionSpec.mergeNeighbors && widgets.length > 0) {
			const originalLength = widgets.length;
			widgets = [];

			const iter = this.decorations.iter();
			let previous = iter.value;
			let previousFrom = iter.from;
			let previousTo = iter.to;
			widgets.push(iter.value.range(iter.from, iter.to));

			for (iter.next(); iter.value; iter.next()) {
				let from = iter.from;
				if (previousTo === iter.from && previous.eq(iter.value)) {
					from = previousFrom;
					widgets.pop();
				}
				widgets.push(iter.value.range(from, iter.to));

				previous = iter.value;
				previousTo = iter.to;
				previousFrom = from;
			}

			if (widgets.length < originalLength) {
				this.decorations = Decoration.set(widgets, true);
			}
		}
	}

	public update(update: ViewUpdate) {
		const forceUpdate = update.transactions.some(transaction => (
			transaction.effects.some(effect => effect.is(updateInlineDecorationsEffect))
			|| extensionSpec.shouldFullReRender?.(transaction)
		));
		if (this.mouseSelectionInProgress && !update.docChanged && !forceUpdate) {
			return;
		}

		if (update.docChanged || update.viewportChanged || update.selectionSet || forceUpdate) {
			this.updateDecorations(update.view);
		}
	}
}, {
	decorations: view => view.decorations,
});

export default makeInlineReplaceExtension;
