import { Plugin } from 'prosemirror-state';
import { Node, NodeSpec, TagParseRule } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';
import sanitizeHtml from '../../utils/sanitizeHtml';
import createEditorDialog from './createEditorDialog';
import { getEditorApi } from '../joplinEditorApiPlugin';
import { msleep } from '@joplin/utils/time';
import postProcessRenderedHtml from './postProcessRenderedHtml';
import createButton from '../../utils/dom/createButton';
import makeLinksClickableInElement from '../../utils/makeLinksClickableInElement';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/

interface JoplinEditableAttributes {
	contentHtml: string;
	source: string;
	language: string;
	openCharacters: string;
	closeCharacters: string;
	readOnly: boolean;
}

const joplinEditableAttributes = {
	contentHtml: { default: '', validate: 'string' },
	source: { default: '', validate: 'string' },
	language: { default: '', validate: 'string' },
	openCharacters: { default: '', validate: 'string' },
	closeCharacters: { default: '', validate: 'string' },
	readOnly: { default: false, validate: 'boolean' },
} satisfies Record<keyof JoplinEditableAttributes, unknown>;

const makeJoplinEditableSpec = (
	inline: boolean,
	// Additional tags that should be interpreted as joplinEditable-like blocks.
	additionalParseRules: TagParseRule[],
): NodeSpec => ({
	group: inline ? 'inline' : 'block',
	inline: inline,
	draggable: true,
	attrs: joplinEditableAttributes,
	parseDOM: [
		{
			tag: `${inline ? 'span' : 'div'}.joplin-editable`,
			getAttrs: (node): Partial<JoplinEditableAttributes> => {
				const sourceNode = node.querySelector('.joplin-source');
				return {
					contentHtml: node.innerHTML,
					source: sourceNode?.textContent,
					openCharacters: sourceNode?.getAttribute('data-joplin-source-open'),
					closeCharacters: sourceNode?.getAttribute('data-joplin-source-close'),
					language: sourceNode?.getAttribute('data-joplin-language'),
					readOnly: !!node.hasAttribute('data-joplin-readonly'),
				};
			},
		},
		...additionalParseRules,
	],
	toDOM: node => {
		const attrs = node.attrs as JoplinEditableAttributes;
		const content = document.createElement(inline ? 'span' : 'div');
		content.classList.add('joplin-editable');
		content.innerHTML = sanitizeHtml(attrs.contentHtml);

		const getSourceNode = () => {
			let sourceNode = content.querySelector('.joplin-source');
			// If the node has a "source" attribute, its content still needs to be saved
			if (!sourceNode && attrs.source) {
				sourceNode = document.createElement(inline ? 'span' : 'div');
				sourceNode.classList.add('joplin-source');
				content.appendChild(sourceNode);
			}
			return sourceNode;
		};

		const sourceNode = getSourceNode();
		if (sourceNode) {
			sourceNode.textContent = attrs.source;
			sourceNode.setAttribute('data-joplin-source-open', attrs.openCharacters);
			sourceNode.setAttribute('data-joplin-source-close', attrs.closeCharacters);
		}

		if (attrs.readOnly) {
			content.setAttribute('data-joplin-readonly', 'true');
		}

		return content;
	},
});

export const nodeSpecs = {
	joplinEditableInline: makeJoplinEditableSpec(true, []),
	joplinEditableBlock: makeJoplinEditableSpec(false, [
		// Table of contents regions are also handled as block editable regions
		{
			tag: 'nav.table-of-contents',
			getAttrs: (node): false|Partial<JoplinEditableAttributes> => {
				// Additional validation to check that this is indeed a [toc].
				if (node.children.length !== 1 || node.children[0]?.tagName !== 'UL') {
					return false; // The rule doesn't match
				}

				return {
					contentHtml: node.innerHTML,
					source: '[toc]',
					// Disable the [toc]'s default rerendering behavior -- table of contents rendering
					// requires the document's full content and won't work if "[toc]" is rendered on its
					// own.
					readOnly: true,
				};
			},
		},
	]),
};

type GetPosition = ()=> number;

class EditableSourceBlockView implements NodeView {
	private editDialogVisible_ = false;
	public readonly dom: HTMLElement;
	public constructor(private node: Node, inline: boolean, private view: EditorView, private getPosition: GetPosition) {
		if ((node.attrs.contentHtml ?? undefined) === undefined) {
			throw new Error(`Unable to create a SourceBlockView for a node lacking contentHtml. Node: ${node}.`);
		}

		this.dom = document.createElement(inline ? 'span' : 'div');
		this.dom.classList.add('joplin-editable');

		// The link tooltip used for other in-editor links won't be shown for links within a
		// rendered source block -- these links need custom logic to be clickable:
		makeLinksClickableInElement(this.dom, view);

		this.updateContent_();
	}

	private showEditDialog_() {
		if (this.editDialogVisible_) {
			return;
		}

		const { localize: _ } = getEditorApi(this.view.state);

		let saveCounter = 0;
		createEditorDialog({
			doneLabel: _('Done'),
			editorLabel: _('Code:'),
			editorApi: getEditorApi(this.view.state),
			block: {
				content: this.node.attrs.source,
				start: this.node.attrs.openCharacters,
				end: this.node.attrs.closeCharacters,
			},
			onSave: async (block) => {
				this.view.dispatch(
					this.view.state.tr.setNodeAttribute(
						this.getPosition(), 'source', block.content,
					).setNodeAttribute(
						this.getPosition(), 'openCharacters', block.start,
					).setNodeAttribute(
						this.getPosition(), 'closeCharacters', block.end,
					),
				);

				saveCounter ++;
				const initialSaveCounter = saveCounter;
				const cancelled = () => saveCounter !== initialSaveCounter;

				// Debounce rendering
				await msleep(400);
				if (cancelled()) return;

				const rendered = await getEditorApi(this.view.state).renderer.renderMarkupToHtml(
					`${block.start}${block.content}${block.end}`,
					{ forceMarkdown: true, isFullPageRender: false },
				);
				if (cancelled()) return;

				const html = postProcessRenderedHtml(rendered.html, this.node.isInline);
				this.view.dispatch(
					this.view.state.tr.setNodeAttribute(
						this.getPosition(), 'contentHtml', html,
					),
				);
			},
			onDismiss: () => {
				this.editDialogVisible_ = false;
			},
		});
	}

	private updateContent_() {
		const setDomContentSafe = (html: string) => {
			this.dom.innerHTML = sanitizeHtml(html);
		};

		const attrs = this.node.attrs as JoplinEditableAttributes;
		const addEditButton = () => {
			const { localize: _ } = getEditorApi(this.view.state);

			const editButton = createButton(_('Edit'), () => this.showEditDialog_());
			editButton.classList.add('edit');

			if (!attrs.readOnly) {
				this.dom.appendChild(editButton);
			}
		};

		setDomContentSafe(attrs.contentHtml);
		postProcessRenderedHtml(this.dom, this.node.isInline);
		addEditButton();
	}

	public selectNode() {
		this.dom.classList.add('-selected');
	}

	public deselectNode() {
		this.dom.classList.remove('-selected');
	}

	public stopEvent(event: Event) {
		// Allow using the keyboard to activate the "edit" button:
		return event.target === this.dom.querySelector('button.edit');
	}

	public update(node: Node) {
		if (node.type.spec !== this.node.type.spec) {
			return false;
		}

		this.node = node;
		this.updateContent_();

		return true;
	}
}

const joplinEditablePlugin = new Plugin({
	props: {
		nodeViews: {
			joplinEditableInline: (node, view, getPos) => new EditableSourceBlockView(node, true, view, getPos),
			joplinEditableBlock: (node, view, getPos) => new EditableSourceBlockView(node, false, view, getPos),
		},
	},
});

export default joplinEditablePlugin;
