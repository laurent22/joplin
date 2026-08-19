import { Plugin } from 'prosemirror-state';
import { Node, NodeSpec } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';
import trimEmptyParagraphs from '../utils/trimEmptyParagraphs';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/

const listGroup = 'block';

// Note: Use snake_case for schema keys for compatibility with certain default ProseMirror code
// (e.g. default input rules from prosemirror-example-setup).
export const nodeSpecs = {
	task_list: {
		content: 'task_list_item+',
		group: listGroup,
		parseDOM: [{ tag: 'ul[data-is-checklist]' }],
		toDOM: () => ['ul', { class: 'task-list', 'data-is-checklist': '1' }, 0],
	},
	ordered_list: {
		content: 'list_item+',
		group: listGroup,

		// Match attributes from https://github.com/ProseMirror/prosemirror-schema-list/blob/master/src/schema-list.ts
		attrs: { order: { default: 1, validate: 'number' } },
		parseDOM: [
			{
				tag: 'ol',
				getAttrs: node => {
					const start = node.hasAttribute('start') ? Number(node.getAttribute('start')) : 1;
					return {
						order: isFinite(start) ? start : 1,
					};
				},
			},
		],
		toDOM: node => (
			node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]
		),
	},
	bullet_list: {
		content: 'list_item+',
		group: listGroup,

		parseDOM: [{ tag: 'ul:not([data-is-checklist])' }],
		toDOM: () => ['ul', 0],
	},
	list_item: {
		content: 'paragraph block*',
		defining: true,
		draggable: true,

		parseDOM: [{ tag: 'li:not(.md-checkbox)' }],
		toDOM: () => ['li', 0],
	},
	task_list_item: {
		content: 'paragraph block*',
		attrs: {
			checked: { default: false, validate: 'boolean' },
		},
		defining: true,
		draggable: true,

		parseDOM: [
			{
				tag: 'li.md-checkbox',
				getAttrs(node) {
					const checkbox = node.querySelector<HTMLInputElement>('input[type=checkbox]');
					return { checked: checkbox?.checked ?? false };
				},
				contentElement(node) {
					const result = node.cloneNode(true) as HTMLElement;

					// Empty paragraphs can cause rendering issues.
					trimEmptyParagraphs(result);

					const firstChild = result.children[0];
					if (firstChild?.matches('div.checkbox-wrapper')) {
						firstChild.remove();

						// Trim empty paragraphs without the first child.
						// Without this, multiple empty paragraphs can accumulate between
						// the list item and its sub-lists.
						trimEmptyParagraphs(result);

						result.prepend(...firstChild.childNodes);
					}
					return result;
				},
			},
		],
		toDOM: (node) => {
			return [
				'li', { class: 'md-checkbox' },
				['input', { type: 'checkbox', checked: node.attrs.checked ? true : undefined }],
				['div', 0],
			];
		},
	},
} satisfies Record<string, NodeSpec>;

type GetPosition = ()=> number;

let idCounter = 0;
class TaskListItemView implements NodeView {
	public readonly dom: HTMLElement;
	public contentDOM: HTMLElement;
	private checkbox_: HTMLInputElement;

	public constructor(node: Node, view: EditorView, getPosition: GetPosition) {
		this.dom = document.createElement('li');
		this.dom.id = `${(idCounter++)}-checkbox-container`;
		this.dom.classList.add('checklist-item', 'md-checkbox', '-flex');

		this.checkbox_ = document.createElement('input');
		this.checkbox_.type = 'checkbox';
		this.checkbox_.checked = node.attrs.checked;
		// Don't use a <label> element as a container since clicking on the container
		// should move focus to the task item, not focus the checkbox.
		// Instead use aria-labelledby for accessibility:
		this.checkbox_.setAttribute('aria-labelledby', this.dom.id);

		this.contentDOM = document.createElement('div');
		this.contentDOM.classList.add('content');

		this.dom.appendChild(this.checkbox_);
		this.dom.appendChild(this.contentDOM);

		this.checkbox_.onchange = () => {
			if (node.attrs.checked !== this.checkbox_.checked) {
				view.dispatch(view.state.tr.setNodeAttribute(
					getPosition(), 'checked', this.checkbox_.checked,
				));
			}
		};
	}
}

const listPlugin = new Plugin({
	props: {
		nodeViews: {
			task_list_item: (node, view, getPos) => new TaskListItemView(node, view, getPos),
		},
	},
});

export default listPlugin;
