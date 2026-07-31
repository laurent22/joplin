// Ref: https://codemirror.net/examples/bundle/
// and  https://codemirror.net/examples/decoration/

import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, Range, SelectionRange, StateEffect, TransactionSpec } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { ReplacementExtension } from '../types';
import nodeIntersectsSelection from './nodeIntersectsSelection';

const updateInlineDecorationsEffect = StateEffect.define();

const isHiddenDecoration = (decoration: Decoration) => (
	!Object.keys(decoration.spec).length || decoration.spec.widget instanceof WidgetType
);

const expandSelectionToFormattingCharacters = (decorations: DecorationSet, selection: SelectionRange, docLength: number) => {
	if (selection.empty) return null;

	const hiddenRanges: { from: number; to: number }[] = [];
	decorations.between(0, docLength, (from, to, decoration) => {
		if (isHiddenDecoration(decoration)) hiddenRanges.push({ from, to });
	});

	let coveredTo = selection.from;
	for (const range of hiddenRanges) {
		if (range.from <= coveredTo) coveredTo = Math.max(coveredTo, range.to);
	}
	if (coveredTo >= selection.to) return EditorSelection.single(selection.head);

	let { from, to } = selection;
	for (let index = hiddenRanges.length - 1; index >= 0; index--) {
		if (hiddenRanges[index].to === from) from = hiddenRanges[index].from;
	}
	for (const range of hiddenRanges) {
		if (range.from === to) to = range.to;
	}

	if (from === selection.from && to === selection.to) return null;
	return selection.anchor <= selection.head ? EditorSelection.single(from, to) : EditorSelection.single(to, from);
};

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
			const selection = this.view.state.selection.main;
			let selectionUpdate: TransactionSpec['selection'] = expandSelectionToFormattingCharacters(
				this.decorations, selection, this.view.state.doc.length,
			) ?? undefined;

			const hasHiddenDecoration = (from: number, to: number) => {
				let found = false;
				this.decorations.between(from, to, (_from, _to, decoration) => {
					if (isHiddenDecoration(decoration)) {
						found = true;
						return false;
					}
					return undefined;
				});
				return found;
			};

			const line = this.view.state.doc.lineAt(selection.from);
			syntaxTree(this.view.state).iterate({
				from: line.from,
				to: line.to,
				enter: node => {
					if (selectionUpdate) return;

					const isHiddenPrefixBeforeSelection = (node.name === 'QuoteMark' || node.name === 'ListMark')
						&& (node.name === 'ListMark' || node.from === line.from)
						&& node.to < selection.from
						&& !this.view.state.sliceDoc(node.to, selection.from).trim()
						&& hasHiddenDecoration(node.from, node.to);
					if (isHiddenPrefixBeforeSelection) {
						selectionUpdate = selection.anchor <= selection.head
							? EditorSelection.single(node.from, selection.to)
							: EditorSelection.single(selection.to, node.from);
						return;
					}

					if (node.name !== 'Link') return;
					const closingBracket = node.node.getChildren('LinkMark').find(mark => (
						this.view.state.sliceDoc(mark.from, mark.to) === ']'
					));
					if (closingBracket && selection.from >= closingBracket.from && selection.to <= node.to && hasHiddenDecoration(closingBracket.from, node.to)) {
						selectionUpdate = { anchor: node.to };
					}
				},
			});

			this.mouseSelectionInProgress = false;
			this.view.dispatch({
				selection: selectionUpdate,
				effects: updateInlineDecorationsEffect.of(null),
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

					const strategy = extensionSpec.getRevealStrategy?.(node, view.state) ?? 'line';

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
	}

	public update(update: ViewUpdate) {
		const forceUpdate = update.transactions.some(transaction => (
			transaction.effects.some(effect => effect.is(updateInlineDecorationsEffect))
			|| extensionSpec.shouldFullReRender?.(transaction)
		));
		if (this.mouseSelectionInProgress && !update.docChanged && (update.selectionSet || forceUpdate)) {
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
