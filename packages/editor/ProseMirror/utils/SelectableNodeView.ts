import { NodeView } from 'prosemirror-view';

export type GetPosition = ()=> number;

export default class SelectableNodeView implements NodeView {
	public readonly dom: HTMLElement;
	public constructor(inline: boolean) {
		this.dom = document.createElement(inline ? 'span' : 'div');
		this.dom.classList.add('joplin-selectable');
	}

	public selectNode() {
		this.dom.classList.add('-selected');
	}

	public deselectNode() {
		this.dom.classList.remove('-selected');
	}
}
