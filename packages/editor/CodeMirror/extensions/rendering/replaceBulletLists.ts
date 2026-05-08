import { EditorView, WidgetType } from '@codemirror/view';
import makeReplaceExtension from './utils/makeInlineReplaceExtension';

const listMarkerClassName = 'cm-bullet-list-marker';

class BulletListMarker extends WidgetType {
	private className: string;
	public constructor(depth: number) {
		super();
		if (depth % 3 === 0) {
			this.className = '-depth-0';
		} else if (depth % 3 === 1) {
			this.className = '-depth-1';
		} else {
			this.className = '-depth-2';
		}
	}

	public eq(other: BulletListMarker) {
		return other.className === this.className;
	}

	public toDOM() {
		const container = document.createElement('span');
		container.classList.add(listMarkerClassName, this.className);
		container.setAttribute('aria-label', 'bullet');
		container.role = 'img';

		const sizingNode = document.createElement('span');
		sizingNode.classList.add('sizing');
		sizingNode.textContent = '-';
		container.appendChild(sizingNode);

		const content = document.createElement('span');
		content.classList.add('content');
		container.appendChild(content);

		return container;
	}

	public updateDOM(other: HTMLElement) {
		other.classList.remove('-depth-0', '-depth-1', '-depth-2');
		other.classList.add(this.className);
		return true;
	}
}

const replaceBulletLists = [
	EditorView.theme({
		[`& .${listMarkerClassName}`]: {
			'pointer-events': 'none',
			'position': 'relative',

			'&.-depth-0 > .content': {
				'border-radius': 0,
			},
			'&.-depth-2 > .content': {
				'border': '1px solid currentcolor',
				'background-color': 'transparent',
			},

			'& > .sizing': {
				'color': 'transparent',
			},

			'& > .content': {
				'position': 'absolute',
				'left': '0',

				'--size': '4px',
				// Push the content to the center of the container
				'--vertical-offset': 'calc(50% - calc(var(--size) / 2))',
				'top': 'var(--vertical-offset)',
				'bottom': 'var(--vertical-offset)',

				'width': 'var(--size)',
				'height': 'var(--size)',
				'box-sizing': 'border-box',
				'border-radius': 'var(--size)',
				'background-color': 'currentcolor',
			},
		},
	}),
	makeReplaceExtension({
		createDecoration: (node, _view, parentTagCounts) => {
			if (node.name === 'ListMark') {
				const parent = node.node.parent;
				if (parent?.name === 'ListItem' && parent?.parent?.name === 'BulletList') {
					return new BulletListMarker(parentTagCounts.get('BulletList') ?? 1);
				}
			}
			return null;
		},
	}),
];

export default replaceBulletLists;
