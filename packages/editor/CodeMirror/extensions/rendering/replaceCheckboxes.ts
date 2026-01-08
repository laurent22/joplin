import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { SyntaxNodeRef } from '@lezer/common';
import makeReplaceExtension from './utils/makeInlineReplaceExtension';
import toggleCheckboxAt from '../../utils/markdown/toggleCheckboxAt';

const checkboxContainerClassName = 'cm-ext-checkbox-toggle';
const checkboxClassName = 'cm-ext-checkbox';


class CheckboxWidget extends WidgetType {
	public constructor(
		private checked: boolean,
		private depth: number,
		private label: string,
		private markup: string,
	) {
		super();
	}

	public eq(other: CheckboxWidget) {
		return other.checked === this.checked
			&& other.depth === this.depth
			&& other.label === this.label
			&& other.markup === this.markup;
	}

	private applyContainerClasses(container: HTMLElement) {
		container.classList.add(checkboxContainerClassName);
		// For sizing: Should have the same font/styles as non-rendered checkboxes:
		container.classList.add('cm-taskMarker');

		for (const className of [...container.classList]) {
			if (className.startsWith('-depth-')) {
				container.classList.remove(className);
			}
		}

		container.classList.add(`-depth-${this.depth}`);
	}

	public toDOM(view: EditorView) {
		const container = document.createElement('span');

		const sizingNode = document.createElement('span');
		sizingNode.classList.add('sizing');
		sizingNode.textContent = this.markup;
		container.appendChild(sizingNode);

		const checkboxWrapper = document.createElement('span');
		checkboxWrapper.classList.add('content');
		container.appendChild(checkboxWrapper);

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = this.checked;
		checkbox.ariaLabel = this.label;
		checkbox.title = this.label;
		checkbox.classList.add(checkboxClassName);
		checkboxWrapper.appendChild(checkbox);

		checkbox.oninput = () => {
			toggleCheckboxAt(view.posAtDOM(container))(view);
		};

		this.applyContainerClasses(container);
		return container;
	}

	public updateDOM(dom: HTMLElement): boolean {
		this.applyContainerClasses(dom);

		const input = dom.querySelector('input');
		if (input) {
			input.checked = this.checked;
			return true;
		}
		return false;
	}

	public ignoreEvent() {
		return false;
	}
}

const completedTaskClassName = 'cm-md-completed-item';
const completedListItemDecoration = Decoration.line({ class: completedTaskClassName, isFullLine: true });

const replaceCheckboxes = [
	EditorView.theme({
		[`& .${checkboxContainerClassName}`]: {
			position: 'relative',

			'& > .sizing': {
				visibility: 'hidden',
			},

			'& > .content': {
				position: 'absolute',
				left: '0',
				right: '0',
				top: '0',
				bottom: '0',
				textAlign: 'center',
			},
		},
		[`& .${checkboxClassName}`]: {
			verticalAlign: 'middle',

			// Ensure that the checkbox grows as the font size increases:
			width: '100%',
			minHeight: '70%',

			// Shift the checkbox slightly so that it's aligned with the list item bullet point
			margin: '0',
			marginBottom: '3px',
		},
		[`& .${completedTaskClassName}`]: {
			opacity: 0.69,
		},
	}),
	EditorView.domEventHandlers({
		mousedown: (event) => {
			const target = event.target as Element;
			if (target.nodeName === 'INPUT' && target.classList?.contains(checkboxClassName)) {
				// Let the checkbox handle the event
				return true;
			}
			return false;
		},
	}),
	makeReplaceExtension({
		createDecoration: (node, state, parentTags) => {
			const markerIsChecked = (marker: SyntaxNodeRef) => {
				const content = state.doc.sliceString(marker.from, marker.to);
				return content.toLowerCase().indexOf('x') !== -1;
			};

			if (node.name === 'TaskMarker') {
				const containerLine = state.doc.lineAt(node.from);
				const labelText = state.doc.sliceString(node.to, containerLine.to);
				const markerText = state.doc.sliceString(node.from, node.to);

				return new CheckboxWidget(
					markerIsChecked(node),
					parentTags.get('ListItem') ?? 0,
					labelText,
					markerText,
				);
			} else if (node.name === 'Task') {
				const marker = node.node.getChild('TaskMarker');
				if (marker && markerIsChecked(marker)) {
					return completedListItemDecoration;
				}
			}
			return null;
		},
		getDecorationRange: (node, state) => {
			if (node.name === 'TaskMarker') {
				const container = node.node.parent?.parent;
				const listMarker = container?.getChild('ListMark');
				if (!listMarker) {
					return null;
				}

				return [node.from, node.to];
			} else if (node.name === 'Task') {
				const taskLine = state.doc.lineAt(node.from);
				return [taskLine.from];
			}

			return null;
		},
	}),
];

export default replaceCheckboxes;
