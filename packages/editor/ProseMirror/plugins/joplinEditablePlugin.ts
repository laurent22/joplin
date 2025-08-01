import { Plugin } from 'prosemirror-state';
import { Node, NodeSpec } from 'prosemirror-model';
import { NodeView } from 'prosemirror-view';
import sanitizeHtml from '../utils/sanitizeHtml';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/


const makeJoplinEditableSpec = (inline: boolean): NodeSpec => ({
	group: inline ? 'inline' : 'block',
	inline: inline,
	draggable: true,
	attrs: {
		contentHtml: { default: '', validate: 'string' },
	},
	parseDOM: [
		{
			tag: `${inline ? 'span' : 'div'}.joplin-editable`,
			getAttrs: node => ({
				contentHtml: node.innerHTML,
			}),
		},
	],
	toDOM: node => {
		const content = document.createElement(inline ? 'span' : 'div');
		content.classList.add('joplin-editable');
		content.innerHTML = sanitizeHtml(node.attrs.contentHtml);
		return content;
	},
});

export const nodeSpecs = {
	joplinEditableInline: makeJoplinEditableSpec(true),
	joplinEditableBlock: makeJoplinEditableSpec(false),
};

class EditableSourceBlockView implements NodeView {
	public readonly dom: HTMLElement;
	public constructor(node: Node, inline: boolean) {
		if ((node.attrs.contentHtml ?? undefined) === undefined) {
			throw new Error(`Unable to create a SourceBlockView for a node lacking contentHtml. Node: ${node}.`);
		}

		this.dom = document.createElement(inline ? 'span' : 'div');
		this.dom.classList.add('joplin-editable');
		this.dom.innerHTML = sanitizeHtml(node.attrs.contentHtml);
	}

	public selectNode() {
		this.dom.classList.add('-selected');
	}

	public deselectNode() {
		this.dom.classList.remove('-selected');
	}
}

const joplinEditablePlugin = new Plugin({
	props: {
		nodeViews: {
			joplinEditableInline: node => new EditableSourceBlockView(node, true),
			joplinEditableBlock: node => new EditableSourceBlockView(node, false),
		},
	},
});

export default joplinEditablePlugin;
