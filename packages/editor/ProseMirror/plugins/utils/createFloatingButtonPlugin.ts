import { Command, EditorState, Plugin, PluginView } from 'prosemirror-state';
import { LocalizationResult, OnLocalize } from '../../../types';
import { EditorView } from 'prosemirror-view';
import createButton from '../../utils/dom/createButton';
import { getEditorApi } from '../joplinEditorApiPlugin';
import { Node } from 'prosemirror-model';
import { Icon } from '../../vendor/icons/types';

type LocalizeFunction = (_: OnLocalize)=> LocalizationResult;

interface ButtonSpec {
	icon?: Icon;
	label: LocalizeFunction;
	command: (node: Node, offset: number)=> Command;
	showForNode?: (node: Node)=> boolean;
	className?: string;
}

export enum ToolbarType {
	// Attempts to keep the toolbar visible when the node
	// is visible. While showing the toolbar outside the node
	// is preferred, the toolbar will be shown inside the node
	// if insufficient outside space is available.
	FloatAboveBelow,
	// Anchors the toolbar to the top right corner of the
	// associated element.
	AnchorTopRight,
}

interface TargetNode {
	offset: number;
	node: Node;
	element: Element|null;
}

class FloatingButtonBar implements PluginView {
	private container_: HTMLElement;
	private buttonRow_: ButtonRow;

	private currentTarget_: TargetNode|null = null;
	private observer_: ElementObserver;

	public constructor(
		private view_: EditorView,
		private targetNodeName_: string,
		buttons: ButtonSpec[],
		private type_: ToolbarType,
	) {
		this.container_ = document.createElement('div');
		this.container_.classList.add('floating-button-bar');

		this.buttonRow_ = new ButtonRow(this.container_, buttons);

		this.observer_ = new ElementObserver(
			() => this.repositionOverlay_(),
		);

		// Prevent other elements (e.g. checkboxes, links) from being between the toolbar button and the
		// target element. If the toolbar is instead included **after** the Rich Text Editor's main content,
		// then all items included directly within the Rich Text Editor come before the toolbar in the focus
		// order.
		view_.dom.parentElement.prepend(this.container_);
		this.update(view_, null);

		if (this.type_ === ToolbarType.AnchorTopRight) {
			this.container_.classList.add('-anchored');
		} else if (this.type_ === ToolbarType.FloatAboveBelow) {
			this.container_.classList.add('-floating');
		} else {
			const unreachable_: never = this.type_;
			throw new Error(`Unknown toolbar type: ${unreachable_}`);
		}
	}

	private repositionOverlay_() {
		if (!this.currentTarget_) return;

		const overlay = this.container_;
		const view = this.view_;
		const target = this.currentTarget_;
		const position = this.view_.coordsAtPos(target.offset);
		const targetElement = view.nodeDOM(target.offset);

		// Fall back to document.body to support testing environments:
		const parentBox = (this.container_.offsetParent ?? document.body).getBoundingClientRect();
		const tooltipBox = this.container_.getBoundingClientRect();
		const targetBox = targetElement instanceof HTMLElement ? targetElement.getBoundingClientRect() : {
			...position,
			width: 0,
			height: 0,
		};

		this.container_.style.left = '';
		this.container_.style.right = '';

		if (this.type_ === ToolbarType.FloatAboveBelow) {
			const padding = 10;
			const above = targetBox.top - tooltipBox.height - parentBox.top - padding;
			const below = targetBox.top + targetBox.height - parentBox.top + padding;
			const viewportTop = window.visualViewport?.pageTop;
			const viewportBottom = viewportTop + window.visualViewport?.height;
			const cursorTop = viewportTop + view.coordsAtPos(view.state.selection.head).top;

			const getOffsetTop = () => {
				// If the toolbar must be displayed within the element to be visible, prefer
				// less movement:
				const previousTop = tooltipBox.top + viewportTop;
				const insideCandidates = [
					Math.max(viewportTop + padding, above),
					Math.min(viewportBottom - padding - tooltipBox.height, below),
				].sort((a, b) => {
					const distanceA = Math.abs(a - previousTop);
					const distanceB = Math.abs(b - previousTop);
					return distanceA - distanceB;
				}).filter(position => {
					return position >= above && position <= below;
				});

				const positionCandidates = [
					// Always prefer showing the toolbar outside the element
					above, below,
					// Fall back to showing the toolbar inside
					...insideCandidates,
				];

				const validCandidates = positionCandidates.filter((position) => {
					const candidateTop = position;
					const candidateBottom = position + tooltipBox.height;
					const candidateCenter = position + tooltipBox.height / 2;
					const distanceFromCursor = Math.abs(candidateCenter - cursorTop);

					return candidateTop >= viewportTop
						// Avoid showing the toolbar off the bottom edge of the screen
						&& candidateBottom <= viewportBottom
						// Avoid showing the toolbar on the same line as the cursor
						&& distanceFromCursor > tooltipBox.height / 2 + padding;
				});
				return validCandidates[0] ?? positionCandidates[0];
			};

			const targetCenter = targetBox.left + targetBox.width / 2;
			const currentCenter = parentBox.left + tooltipBox.width / 2;
			// Subtract (parentBox.left, parentBox.top): style.left and style.top
			// are relative to the parent, but the computed position is not.
			overlay.style.left = `${Math.max(targetCenter - currentCenter, 0)}px`;
			overlay.style.top = `${getOffsetTop()}px`;
		} else if (this.type_ === ToolbarType.AnchorTopRight) {
			overlay.style.right = `${parentBox.width - targetBox.width - (targetBox.left - parentBox.left)}px`;
			overlay.style.top = `${targetBox.top - parentBox.top}px`;
		}
	}

	public update(view: EditorView, lastState: EditorState|null) {
		this.view_ = view;

		const state = view.state;
		const sameSelection = lastState && state.selection.eq(lastState.selection);
		const sameDoc = lastState && state.doc.eq(lastState.doc);
		if (sameSelection && sameDoc) {
			return;
		}

		const findTargetNode = () => {
			let target: TargetNode|null = null;
			state.doc.nodesBetween(state.selection.from, state.selection.to, (node, offset) => {
				if (node.type.name === this.targetNodeName_) {
					const dom = view.nodeDOM(offset);
					const domElement = dom instanceof HTMLElement ? dom : dom.parentElement;
					target = { node, offset, element: domElement };
					return false;
				}
				return true;
			});

			return target;
		};

		const target = findTargetNode();
		this.observer_.setElement(target?.element);
		this.currentTarget_ = target;

		if (!target) {
			this.container_.classList.add('-hidden');
		} else {
			this.container_.classList.remove('-hidden');

			this.buttonRow_.updateButtons(view, target);
			this.repositionOverlay_();
		}
	}

	public destroy() {
		this.observer_.destroy();
	}
}

// Emits changes when the element's position changes.
class ElementObserver {
	private intersectionObserver_: IntersectionObserver|null;
	private lastElement_: Element|null = null;

	public constructor(private onNodeUpdate_: ()=> void) {
		if (typeof IntersectionObserver !== 'undefined') {
			this.intersectionObserver_ = new IntersectionObserver(() => {
				this.onNodeUpdate_();
			});
		}
		document.addEventListener('scroll', this.onNodeUpdate_);
		window.addEventListener('resize', this.onNodeUpdate_);
	}

	public setElement(element: Element|null) {
		if (element === this.lastElement_) return;

		if (this.lastElement_) {
			this.intersectionObserver_?.unobserve(this.lastElement_);
		}

		if (element) {
			this.intersectionObserver_?.observe(element);
		}

		this.lastElement_ = element;
	}

	public destroy() {
		this.intersectionObserver_?.disconnect();
		this.intersectionObserver_ = null;

		document.removeEventListener('scroll', this.onNodeUpdate_);
		window.removeEventListener('resize', this.onNodeUpdate_);
	}
}

class ButtonRow {
	private created_ = false;
	public constructor(private container_: HTMLElement, private buttons_: ButtonSpec[]) { }

	public updateButtons(view: EditorView, targetNode: TargetNode) {
		// Late-init the buttons to allow accessing `view`:
		if (!this.created_) {
			this.created_ = true;

			const { localize } = getEditorApi(view.state);
			this.container_.replaceChildren(...this.buttons_.map(buttonSpec => {
				const label = buttonSpec.label(localize);
				const button = createButton(
					buttonSpec.icon ? { label, icon: buttonSpec.icon() } : label,
					() => { },
				);

				button.classList.add('action', 'action-button');
				if (buttonSpec.icon) {
					button.classList.add('-icon');
				}

				if (buttonSpec.className) {
					button.classList.add(buttonSpec.className);
				}

				return button;
			}));
		}

		// Update the button listeners and states based on the current view and
		// target node
		for (let i = 0; i < this.buttons_.length; i++) {
			const button = this.container_.children[i] as HTMLButtonElement;
			const buttonSpec = this.buttons_[i];

			const command = buttonSpec.command(targetNode.node, targetNode.offset);
			button.onclick = () => {
				command(view.state, view.dispatch, view);
			};

			button.disabled = !command(view.state);
		}
	}
}

const createFloatingButtonPlugin = (nodeName: string, actions: ButtonSpec[], position: ToolbarType) => {
	return new Plugin({
		view: (view) => new FloatingButtonBar(view, nodeName, actions, position),
	});
};

export default createFloatingButtonPlugin;
