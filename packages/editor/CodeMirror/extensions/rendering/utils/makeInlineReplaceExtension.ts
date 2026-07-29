// Ref: https://codemirror.net/examples/bundle/
// and  https://codemirror.net/examples/decoration/

import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, Range, StateEffect } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { ReplacementExtension } from '../types';
import nodeIntersectsSelection from './nodeIntersectsSelection';

const updateInlineDecorationsEffect = StateEffect.define();

export const makeInlineReplaceExtension = (extensionSpec: ReplacementExtension) => ViewPlugin.fromClass(class {
	public decorations: DecorationSet;
	private mouseSelectionInProgress = false;
	private touchSelectionInProgress = false;
	private touchSelectionPosition: number|null = null;

	public constructor(private view: EditorView) {
		view.dom.addEventListener('mousedown', this.onMouseDown, true);
		view.dom.addEventListener('pointerdown', this.onPointerDown, true);
		view.dom.ownerDocument.addEventListener('mouseup', this.onMouseUp);
		view.dom.addEventListener('touchstart', this.onTouchStart);
		view.dom.addEventListener('click', this.onMouseUp);
		view.dom.ownerDocument.addEventListener('touchcancel', this.onTouchCancel);
		this.updateDecorations(view);
	}

	public destroy() {
		this.view.dom.removeEventListener('mousedown', this.onMouseDown, true);
		this.view.dom.removeEventListener('pointerdown', this.onPointerDown, true);
		this.view.dom.ownerDocument.removeEventListener('mouseup', this.onMouseUp);
		this.view.dom.removeEventListener('touchstart', this.onTouchStart);
		this.view.dom.removeEventListener('click', this.onMouseUp);
		this.view.dom.ownerDocument.removeEventListener('touchcancel', this.onTouchCancel);
		this.touchSelectionInProgress = false;
	}

	private onMouseDown = (event: MouseEvent) => {
		if (event.button === 0) {
			this.mouseSelectionInProgress = true;
		}
	};

	private onPointerDown = (event: PointerEvent) => {
		if (event.pointerType !== 'touch' && this.touchSelectionInProgress) {
			this.mouseSelectionInProgress = false;
			this.touchSelectionInProgress = false;
		}
	};

	private onTouchStart = (event: TouchEvent) => {
		this.touchSelectionInProgress = true;
		const touch = event.targetTouches[0];
		this.touchSelectionPosition = touch ? this.view.posAtCoords({ x: touch.clientX, y: touch.clientY }, false) : null;
	};

	private onTouchCancel = () => {
		this.mouseSelectionInProgress = false;
		this.touchSelectionInProgress = false;
		this.view.dispatch({ effects: updateInlineDecorationsEffect.of(null) });
	};

	private onMouseUp = (event?: Event) => {
		if (event?.type === 'mouseup' && this.touchSelectionInProgress) return;

		if (this.mouseSelectionInProgress || this.touchSelectionInProgress) {
			const isTouchSelection = this.touchSelectionInProgress;
			const selection = isTouchSelection && this.touchSelectionPosition !== null
				? EditorSelection.cursor(this.touchSelectionPosition)
				: this.view.state.selection.main;
			let coveredTo = selection.from;
			this.decorations.between(selection.from, selection.to, (from, to, decoration) => {
				if (!Object.keys(decoration.spec).length && from <= coveredTo) {
					coveredTo = Math.max(coveredTo, to);
				}
			});

			const hasHiddenDecoration = (from: number, to: number) => {
				let found = false;
				this.decorations.between(from, to, (_from, _to, decoration) => {
					if (!Object.keys(decoration.spec).length) {
						found = true;
						return false;
					}
					return undefined;
				});
				return found;
			};

			let selectionUpdate = !selection.empty && coveredTo >= selection.to ? { anchor: selection.head } : undefined;
			const line = this.view.state.doc.lineAt(selection.from);
			syntaxTree(this.view.state).iterate({
				from: line.from,
				to: line.to,
				enter: node => {
					if (selectionUpdate || node.name !== 'Link') return;
					const closingBracket = node.node.getChildren('LinkMark').find(mark => (
						this.view.state.sliceDoc(mark.from, mark.to) === ']'
					));
					const isTouchCursorInLinkLabel = !!closingBracket && isTouchSelection && selection.empty
						&& selection.from >= node.from && selection.to <= closingBracket.to;
					if (closingBracket && (isTouchCursorInLinkLabel || (
						selection.from >= closingBracket.from && selection.to <= node.to
					)) && hasHiddenDecoration(closingBracket.from, node.to)) {
						selectionUpdate = { anchor: node.to };
					}
				},
			});

			this.mouseSelectionInProgress = false;
			this.touchSelectionInProgress = false;
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
		if ((this.mouseSelectionInProgress || this.touchSelectionInProgress) && !update.docChanged && (update.selectionSet || forceUpdate)) {
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
