// Ref: https://codemirror.net/examples/bundle/
// and  https://codemirror.net/examples/decoration/

import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, EditorState, Range, StateEffect } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { ReplacementExtension } from '../types';
import nodeIntersectsSelection from './nodeIntersectsSelection';
import clampSelectionToDocument from '../../../utils/clampSelectionToDocument';

const updateInlineDecorationsEffect = StateEffect.define();

interface MouseSelectionState {
	initialSelection: EditorSelection;
}

interface VisibleRange {
	from: number;
	to: number;
}

export const makeInlineReplaceExtension = (extensionSpec: ReplacementExtension) => ViewPlugin.fromClass(class {
	public decorations: DecorationSet = Decoration.set([]);
	private mouseSelectionBefore_: MouseSelectionState|null = null;

	public constructor(private view: EditorView) {
		view.dom.addEventListener('mousedown', this.onMouseDown, true);
		view.dom.ownerDocument.addEventListener('mouseup', this.onMouseUp);
		this.updateDecorations(view.state, view.visibleRanges);
	}

	public destroy() {
		this.view.dom.removeEventListener('mousedown', this.onMouseDown, true);
		this.view.dom.ownerDocument.removeEventListener('mouseup', this.onMouseUp);
	}

	private onMouseDown = (event: MouseEvent) => {
		if (event.button === 0) {
			this.mouseSelectionBefore_ = { initialSelection: this.view.state.selection };
		}
	};

	private onMouseUp = () => {
		if (this.mouseSelectionBefore_) {
			// To prevent unnecessary scroll on iOS, decoration changes need to
			// happen *after* the gesture ends.
			requestAnimationFrame(() => {
				this.mouseSelectionBefore_ = null;
				this.view.dispatch({
					effects: updateInlineDecorationsEffect.of(null),
				});
			});
		}
	};

	private updateDecorations(state: EditorState, visibleRanges: readonly VisibleRange[]) {
		const doc = state.doc;
		let selection = state.selection;
		if (this.mouseSelectionBefore_?.initialSelection) {
			selection = clampSelectionToDocument(this.mouseSelectionBefore_.initialSelection, doc);
		}
		if (this.mouseSelectionBefore_) {
			state = state.update({ selection }).state;
		}
		const cursorLine = doc.lineAt(selection.main.anchor);

		const parentTagCounts = new Map<string, number>();
		const decorateNode = (node: SyntaxNodeRef) => {
			const widgetOrDecoration = extensionSpec.createDecoration(node, state, parentTagCounts);
			let decoration;
			if (widgetOrDecoration instanceof WidgetType) {
				decoration = Decoration.replace({
					widget: widgetOrDecoration,
				});
			} else if (widgetOrDecoration instanceof Decoration) {
				decoration = widgetOrDecoration;
			}

			if (decoration) {
				const range = extensionSpec.getDecorationRange?.(node, state, parentTagCounts) ?? [node.from, node.to];
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
		for (const { from, to } of visibleRanges) {
			parentTagCounts.clear();
			syntaxTree(state).iterate({
				from, to,
				enter: node => {
					parentTagCounts.set(node.name, (parentTagCounts.get(node.name) ?? 0) + 1);

					const strategy = extensionSpec.getRevealStrategy?.(node, state, parentTagCounts) ?? 'line';

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

		// Document changes move the selection, so the original selection may no longer
		// be valid:
		if (update.docChanged) {
			this.mouseSelectionBefore_ = null;
		}

		if (update.docChanged || update.viewportChanged || update.selectionSet || forceUpdate) {
			this.updateDecorations(update.state, update.view.visibleRanges);
		}
	}
}, {
	decorations: view => view.decorations,
});

export default makeInlineReplaceExtension;
