import { EditorSelection, Facet, StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import normalizeRenderedSelection, { HiddenSyntaxRange } from './normalizeRenderedSelection';

export const updateInlineDecorationsEffect = StateEffect.define();

export const hiddenSyntaxFacet = Facet.define<(view: EditorView)=> readonly HiddenSyntaxRange[]>();

interface MouseGesture {
	initialSelection: EditorSelection;
	initialHiddenSyntax: readonly HiddenSyntaxRange[];
	hasPointerSelection: boolean;
}

// Shared by all inline renderers: freeze their reveal state during a gesture,
// then complete the selection and reveal source syntax in a single transaction.
const renderedSelection = ViewPlugin.fromClass(class {
	private gesture: MouseGesture|null = null;
	private pendingRefresh: number|null = null;

	public constructor(private view: EditorView) {
		view.dom.addEventListener('mousedown', this.onMouseDown, true);
		view.dom.ownerDocument.addEventListener('mouseup', this.onMouseUp);
		// A drag-and-drop or focus change can swallow the mouseup.
		view.dom.ownerDocument.addEventListener('dragend', this.finishGesture);
		view.dom.ownerDocument.addEventListener('mousemove', this.onMouseMove);
		view.dom.ownerDocument.defaultView?.addEventListener('blur', this.finishGesture);
	}

	public get initialSelection() {
		return this.gesture?.initialSelection;
	}

	private hiddenSyntax() {
		return this.view.state.facet(hiddenSyntaxFacet).flatMap(getRanges => getRanges(this.view));
	}

	private cancelGesture() {
		this.gesture = null;
		if (this.pendingRefresh !== null) {
			cancelAnimationFrame(this.pendingRefresh);
			this.pendingRefresh = null;
		}
	}

	private onMouseDown = (event: MouseEvent) => {
		if (event.button !== 0) return;
		this.cancelGesture();
		this.gesture = {
			initialSelection: this.view.state.selection,
			initialHiddenSyntax: this.hiddenSyntax(),
			hasPointerSelection: false,
		};
	};

	private onMouseUp = (event: MouseEvent) => {
		if (event.button === 0) this.finishGesture();
	};

	private onMouseMove = (event: MouseEvent) => {
		if (event.buttons === 0) this.finishGesture();
	};

	private finishGesture = () => {
		const gesture = this.gesture;
		if (!gesture || this.pendingRefresh !== null) return;

		// Wait until CodeMirror has finished the gesture. Changing decorations
		// earlier can also cause unnecessary scrolling on iOS.
		this.pendingRefresh = requestAnimationFrame(() => {
			this.pendingRefresh = null;
			const currentSelection = this.view.state.selection;
			const selection = gesture.hasPointerSelection
				? normalizeRenderedSelection(currentSelection, [
					// Renderers only decorate the main viewport, which may no longer contain
					// the anchor's line. Reveal state is frozen, so the snapshot is still valid.
					...gesture.initialHiddenSyntax, ...this.hiddenSyntax(),
				])
				: currentSelection;
			this.gesture = null;
			const selectionChanged = !selection.eq(currentSelection);
			this.view.dispatch({
				selection: selectionChanged ? selection : undefined,
				userEvent: selectionChanged ? 'select.pointer' : undefined,
				effects: updateInlineDecorationsEffect.of(null),
			});
		});
	};

	public update(update: ViewUpdate) {
		if (!this.gesture) return;
		if (update.docChanged) {
			this.cancelGesture();
		} else if (update.selectionSet) {
			const isPointer = update.transactions.some(transaction => transaction.isUserEvent('select.pointer'));
			if (!isPointer && this.pendingRefresh !== null) {
				this.cancelGesture();
			} else {
				// CodeMirror keeps dragging after other selection changes (e.g. Shift+Down),
				// so keep the gesture and only complete selections the pointer made.
				this.gesture.hasPointerSelection = isPointer;
			}
		}
	}

	public destroy() {
		this.cancelGesture();
		this.view.dom.removeEventListener('mousedown', this.onMouseDown, true);
		this.view.dom.ownerDocument.removeEventListener('mouseup', this.onMouseUp);
		this.view.dom.ownerDocument.removeEventListener('dragend', this.finishGesture);
		this.view.dom.ownerDocument.removeEventListener('mousemove', this.onMouseMove);
		this.view.dom.ownerDocument.defaultView?.removeEventListener('blur', this.finishGesture);
	}
});

export default renderedSelection;
